import { Injector } from '@tanbo/di';

import {
  BackboneAbstractComponent,
  BranchAbstractComponent,
  Commander,
  DivisionAbstractComponent, ElementPosition,
  Fragment,
  TBPlugin,
  TBSelection
} from '../core/_api';
import { FindCommander } from '../toolbar/commands/find.commander';
import { FindAndReplaceRule } from '../toolbar/tools/find.tool';
import { PreComponent } from '../components/pre.component';
import { RootComponent } from '../root-component';
import { EDITOR_SCROLL_CONTAINER } from '../editor';
import { Input } from '../workbench/_api';

export class FindPlugin implements TBPlugin {
  private findValue: string;
  private commander: FindCommander;
  private positions: ElementPosition[] = [];
  private positionIndex = 0;
  private scrollContainer: HTMLElement;

  private selection: TBSelection;
  private rootComponent: RootComponent;
  private input: Input
  setup(injector: Injector) {
    this.selection = injector.get(TBSelection);
    this.rootComponent = injector.get(RootComponent);
    this.input = injector.get(Input);
    this.scrollContainer = injector.get(EDITOR_SCROLL_CONTAINER);
  }

  onApplyCommand(commander: Commander,
                 params: any,
                 updateParamsFn: (newParams: any) => void) {
    if (commander instanceof FindCommander) {
      const rule = params as FindAndReplaceRule;
      if (rule.next) {
        commander.recordHistory = false;
        this.positionIndex++;
      } else if (rule.replace) {
        commander.recordHistory = true;
        const current = this.positions[this.positionIndex];
        if (current) {
          current.fragment.cut(current.startIndex, current.endIndex);
          current.fragment.insert(rule.replaceValue, current.startIndex);
        }
      } else if (rule.replaceAll) {
        commander.recordHistory = true;
        this.positions.reverse().forEach(p => {
          p.fragment.cut(p.startIndex, p.endIndex);
          p.fragment.insert(rule.replaceValue, p.startIndex);
        });
      } else {
        commander.recordHistory = false;
        this.positionIndex = 0;
        this.selection.removeAllRanges();
        this.commander = commander;
        this.findValue = params.findValue;
      }
      const newParams = this.findValue ? this.find(this.rootComponent.slot, this.findValue) : [];
      this.positions = newParams;
      this.positionIndex = this.positionIndex % this.positions.length || 0;
      updateParamsFn(newParams);
    }
  }

  onRenderingBefore() {
    if (this.findValue && this.commander) {
      const newPositions = this.find(this.rootComponent.slot, this.findValue);
      if (newPositions.length !== this.positions.length) {
        this.positions = newPositions;
        this.positions.forEach((p, i) => {
          if (p.fragment === this.selection.commonAncestorFragment) {
            this.positionIndex = i;
          }
        })
        this.commander.command({
          selection: this.selection,
          overlap: false
        }, this.positions);
      }
    }
    return true;
  }

  onViewUpdated() {
    if (this.positions.length) {
      const range = this.selection.createRange();
      const current = this.positions[this.positionIndex];
      range.setStart(current.fragment, current.startIndex);
      range.setEnd(current.fragment, current.endIndex);
      this.selection.removeAllRanges(true);
      this.selection.addRange(range);
      this.selection.restore();
      const position = range.getRangePosition();
      this.scrollContainer.scrollTop = position.top;
    }
  }

  private find(fragment: Fragment, search: string): ElementPosition[] {
    const result: ElementPosition[] = [];
    fragment.sliceContents(0).forEach(item => {
      if (item instanceof PreComponent) {
        return;
      }
      if (typeof item === 'string' && search) {
        let position = 0;
        while (true) {
          const i = item.indexOf(search, position);
          if (i > -1) {
            result.push({
              fragment,
              startIndex: i,
              endIndex: i + search.length
            })
            position = i + search.length;
          } else {
            break;
          }
        }
      } else if (item instanceof DivisionAbstractComponent) {
        result.push(...this.find(item.slot, search));
      } else if (item instanceof BranchAbstractComponent) {
        item.slots.forEach(s => result.push(...this.find(s, search)));
      } else if (item instanceof BackboneAbstractComponent) {
        Array.from(item).forEach(s => result.push(...this.find(s, search)));
      }
    });
    return result;
  }
}
