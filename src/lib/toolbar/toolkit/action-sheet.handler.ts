import { Observable, Subject } from 'rxjs';

import { HighlightState } from '../help';
import { Tool } from './help';
import { Keymap, KeymapAction, Commander } from '../../core/_api';
import { Matcher, SelectionMatchState } from '../matcher/_api';
import { UIDropdown, UIKit } from '../../uikit/uikit';

export interface ActionConfig {
  /** 设置当前 action 的 value */
  value?: any;
  /** 设置当前 action 显示的文字 */
  label?: string;
  /** 给当前 action 添加一组 css class */
  classes?: string[];
  /** 给当前 action 添加一组 icon css class */
  iconClasses?: string[];
  /** 给当前 action 添加一组 css class */
  keymap?: Keymap;
}

export interface ActionSheetToolConfig {
  /** 当前控件可操作的选项 */
  actions: ActionConfig[];

  /** 当某一项被点击时调用的命令 */
  commanderFactory(): Commander;

  /** 锚中节点的的匹配项配置 */
  matcher?: Matcher;
  /** 设置控件显示的文字 */
  label?: string;
  /** 给当前控件添加一组 css class */
  classes?: string[];
  /** 给控件添加一组 icon css class 类 */
  iconClasses?: string[];
  /** 当鼠标放在控件上的提示文字 */
  tooltip?: string;
  /** 是否支持源代码编辑模式 */
  supportSourceCodeMode?: boolean;
}

export class ActionSheetHandler implements Tool {
  readonly elementRef: HTMLElement;
  onMatched: Observable<ActionConfig>;
  onApply: Observable<any>;
  keymapAction: KeymapAction[] = [];
  commander: Commander;

  private matchedEvent = new Subject<ActionConfig>();
  private eventSource = new Subject<any>();
  private dropdown: UIDropdown;

  constructor(private config: ActionSheetToolConfig,
              private stickyElement: HTMLElement) {
    this.onApply = this.eventSource.asObservable();
    this.onMatched = this.matchedEvent.asObservable();

    this.dropdown = UIKit.actions({
      ...config,
      stickyElement,
      items: config.actions.map(v => {
        return {
          ...v,
          onChecked() {
            this.eventSource.next(v.value);
          }
        }
      })
    })

    this.commander = config.commanderFactory();

    config.actions.forEach(action => {
      if (action.keymap) {
        this.keymapAction.push({
          keymap: action.keymap,
          action: () => {
            if (!this.dropdown.disabled) {
              this.eventSource.next(action.value);
            }
          }
        })
      }
    })
    this.elementRef = this.dropdown.elementRef;
  }

  updateStatus(selectionMatchState: SelectionMatchState): void {
    switch (selectionMatchState.state) {
      case HighlightState.Highlight:
        this.dropdown.disabled = false;
        this.dropdown.highlight = true;
        break;
      case HighlightState.Normal:
        this.dropdown.disabled = false;
        this.dropdown.highlight = false;
        break;
      case HighlightState.Disabled:
        this.dropdown.disabled = true;
        this.dropdown.highlight = false;
        break
    }
  }

  onDestroy() {
    //
  }
}
