import { Observable, of, Subject, merge } from 'rxjs';
import { tap } from 'rxjs/operators';

import { TBRange, TBRangePosition } from './range';
import { Renderer } from './renderer';
import { Fragment } from './fragment';
import {
  AbstractComponent,
  BackboneAbstractComponent,
  BranchAbstractComponent,
  DivisionAbstractComponent
} from './component';
import { TBPlugin } from './plugin';
import { makeError } from '../_utils/make-error';

/**
 * 记录选区路径数据。
 */
export interface RangePath {
  startPaths: number[];
  endPaths: number[];
}

const selectionErrorFn = makeError('Selection');

/**
 * TextBus 选区对象
 */
export class TBSelection {
  /**
   * 选区范围个数。
   */
  get rangeCount() {
    return this._ranges.length;
  }

  /**
   * 所有选区范围集合。
   */
  get ranges() {
    return this._ranges;
  }

  /**
   * 所有选区的所属最近的公共 fragment。
   */
  get commonAncestorFragment() {
    return this.getCommonFragment();
  }

  get commonAncestorComponent() {
    return this.getCommonComponent()
  }

  /**
   * 获取 Selection 的第一个 Range。
   */
  get firstRange() {
    return this.ranges[0] || null;
  }

  /**
   * 获取 Selection 的最后一个 Range。
   */
  get lastRange() {
    return this.ranges[this.ranges.length - 1] || null;
  }

  /**
   * 当前 Selection 是否折叠。
   */
  get collapsed() {
    return this.ranges.length === 1 && this.firstRange.collapsed || this.ranges.length === 0;
  }

  onChange: Observable<any>;

  private _ranges: TBRange[] = [];
  private nativeSelection: Selection;
  private selectionChangeEvent = new Subject<void>();
  private isChanged = false;

  constructor(private context: Document,
              private selectionChange: Observable<any>,
              private renderer: Renderer,
              private pipes: TBPlugin[] = []) {
    this.nativeSelection = context.getSelection();
    this.onChange = merge(selectionChange, this.selectionChangeEvent.asObservable()).pipe(tap(() => {
      this.isChanged = true;
      this._ranges = [];
      for (let i = 0; i < this.nativeSelection.rangeCount; i++) {
        const nativeRange = this.nativeSelection.getRangeAt(i);
        const startFocusNode = this.findFocusNode(nativeRange.startContainer);
        const endFocusNode = this.findFocusNode(nativeRange.endContainer);
        if (!startFocusNode || !endFocusNode || !startFocusNode.parentNode || !endFocusNode.parentNode) {
          continue;
        }
        if (startFocusNode !== nativeRange.startContainer) {
          const startNextSibling = startFocusNode.nextSibling;
          if (startNextSibling && startNextSibling.nodeType === Node.TEXT_NODE) {
            nativeRange.setStart(startNextSibling, 0);
          } else {
            nativeRange.setStart(startFocusNode.parentNode,
              Array.from(startFocusNode.parentNode.childNodes).indexOf(startFocusNode as ChildNode) + 1);
          }
        }
        if (endFocusNode !== nativeRange.endContainer) {
          const endNextSibling = endFocusNode.nextSibling;
          if (endNextSibling && endNextSibling.nodeType === Node.TEXT_NODE) {
            nativeRange.setEnd(endNextSibling, 0);
          } else {
            nativeRange.setEnd(endFocusNode.parentNode,
              Array.from(endFocusNode.parentNode.childNodes).indexOf(endFocusNode as ChildNode) + 1);
          }
        }
        this._ranges.push(new TBRange(nativeRange.cloneRange(), this.renderer));
      }
    })).pipe(tap(() => {
      pipes.forEach(plugin => {
        plugin.onSelectionChange?.();
      })
    }));
  }

  /**
   * 通过 TBRange 复位原生选区。
   */
  restore() {
    this.isChanged = false;
    this._ranges.forEach(range => {
      if (range.commonAncestorComponent) {
        range.restore();
      }
    });

    const startNativeRange = this.firstRange?.nativeRange;
    const endNativeRange = this.lastRange?.nativeRange;
    if (startNativeRange && endNativeRange) {
      let nativeRange: Range;
      if (this.nativeSelection.rangeCount) {
        nativeRange = this.nativeSelection.getRangeAt(0);
      } else {
        nativeRange = this.context.createRange();
        this.nativeSelection.addRange(nativeRange);
      }
      nativeRange.setStart(startNativeRange.startContainer, startNativeRange.startOffset);
      nativeRange.setEnd(endNativeRange.endContainer, endNativeRange.endOffset);
    }
    if (!this.isChanged) {
      this.selectionChangeEvent.next()
    }
  }

  /**
   * 清除所有的 Range。
   * @param syncNative
   */
  removeAllRanges(syncNative = false) {
    if (syncNative) {
      this.nativeSelection.removeAllRanges();
    }
    this._ranges = [];
  }

  /**
   * 添加一个 Range。
   * @param range
   */
  addRange(range: TBRange) {
    this._ranges.push(range);
  }

  /**
   * 创建一个新的区域
   */
  createRange() {
    return new TBRange(this.context.createRange(), this.renderer);
  }

  /**
   * 获取当前 Selection 所有 Range 的 path
   */
  getRangePaths(): Array<RangePath> {
    const getPaths = (fragment: Fragment): number[] => {
      const paths = [];
      while (fragment) {
        const parentComponent = fragment.parentComponent;
        if (!parentComponent.parentFragment) {
          break;
        }
        if (parentComponent instanceof BranchAbstractComponent) {
          paths.push(parentComponent.slots.indexOf(fragment))
        } else if (parentComponent instanceof BackboneAbstractComponent) {
          paths.push(parentComponent.indexOf(fragment));
        } else {
          paths.push(0);
        }
        fragment = parentComponent.parentFragment;
        if (fragment) {
          paths.push(fragment.indexOf(parentComponent));
        }
      }
      return paths.reverse();
    };
    return this.ranges.map<RangePath>(range => {
      const paths = getPaths(range.startFragment);
      paths.push(range.startIndex);
      if (range.collapsed) {
        return {
          startPaths: paths,
          endPaths: paths
        }
      } else {
        const endPaths = getPaths(range.endFragment);
        endPaths.push(range.endIndex);
        return {
          startPaths: paths,
          endPaths
        }
      }
    });
  }

  /**
   * 将一组路径应用到当前 Selection
   * @param paths
   * @param fragment
   */
  usePaths(paths: RangePath[], fragment: Fragment) {
    const findPosition = (position: number[], fragment: Fragment): TBRangePosition => {
      const paths = position.map(i => i).reverse();
      while (true) {
        const index = paths.pop();
        const c = fragment.getContentAtIndex(index);
        const last = paths.pop();
        if (c instanceof DivisionAbstractComponent && last === 0) {
          fragment = c.slot;
        } else if (c instanceof BranchAbstractComponent) {
          fragment = c.slots[last];
        } else if (c instanceof BackboneAbstractComponent) {
          fragment = c.getSlotAtIndex(last);
        } else {
          throw selectionErrorFn('location of the history range could not be found.')
        }
        if (paths.length === 1) {
          return {
            fragment,
            index: paths.pop()
          }
        }
      }
    };
    let nativeRange: Range;

    if (this.nativeSelection.rangeCount) {
      nativeRange = this.nativeSelection.getRangeAt(0);
    } else {
      nativeRange = this.context.createRange();
    }

    const len = paths.length;
    if (len === 0) {
      return;
    }

    const startPaths = paths[0].startPaths;
    const endPaths = paths[len - 1].endPaths;
    const start = findPosition(startPaths, fragment);
    const range = new TBRange(nativeRange, this.renderer);

    range.startIndex = start.index;
    range.startFragment = start.fragment;

    if (endPaths === startPaths) {
      range.endIndex = start.index;
      range.endFragment = start.fragment;
    } else {
      const end = findPosition(endPaths, fragment);
      range.endIndex = end.index;
      range.endFragment = end.fragment;
    }
    this.removeAllRanges();
    this.addRange(range);
  }

  /**
   * 克隆当前 Selection 的副本，并返回。
   */
  clone() {
    const t = new TBSelection(this.context, of(), this.renderer);
    t._ranges = this.ranges.map(r => r.clone());
    return t;
  }

  private getCommonComponent(): AbstractComponent {
    const ranges = this.ranges || [];
    if (ranges.length === 1) {
      return ranges[0].commonAncestorComponent;
    }
    const depth: AbstractComponent[][] = [];

    ranges.map(range => range.commonAncestorComponent).forEach(component => {
      const tree = [];
      while (component) {
        tree.push(component);
        component = component.parentFragment?.parentComponent;
      }
      depth.push(tree);
    });

    let component: AbstractComponent = null;

    while (true) {
      const firstComponents = depth.map(arr => arr.pop()).filter(i => i);
      if (firstComponents.length === depth.length) {
        if (new Set(firstComponents).size === 1) {
          component = firstComponents[0];
        } else {
          break;
        }
      } else {
        break;
      }
    }
    return component;
  }

  private getCommonFragment(): Fragment {
    const ranges = this.ranges || [];
    if (ranges.length === 1) {
      return ranges[0].commonAncestorFragment;
    }

    const depth: Fragment[][] = [];

    ranges.map(range => range.commonAncestorFragment).forEach(fragment => {
      const tree = [];
      while (fragment) {
        tree.push(fragment);
        fragment = fragment.parentComponent?.parentFragment;
      }
      depth.push(tree);
    });

    let fragment: Fragment = null;

    while (true) {
      const firstFragments = depth.map(arr => arr.pop()).filter(i => i);
      if (firstFragments.length === depth.length) {
        if (new Set(firstFragments).size === 1) {
          fragment = firstFragments[0];
        } else {
          break;
        }
      }
    }
    return fragment;
  }

  private findFocusNode(node: Node): Node {
    const position = this.renderer.getPositionByNode(node);
    if (!position) {
      const parentNode = node.parentNode;
      if (parentNode) {
        return this.findFocusNode(parentNode);
      }
      return null;
    }
    return node;
  }
}
