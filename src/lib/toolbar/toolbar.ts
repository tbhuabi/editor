import { fromEvent, Observable, Subject, Subscription } from 'rxjs';
import { auditTime, distinctUntilChanged, map } from 'rxjs/operators';
import { forwardRef, Inject, Injectable, Injector } from '@tanbo/di';

import { HighlightState } from './help';
import {
  AdditionalHandler,
  AdditionalViewer,
  GroupHandler,
  Tool,
  ToolConfig,
  ToolFactory,
  ToolType
} from './toolkit/_api';
import { Input, Keymap, KeymapAction, Dialog } from '../workbench/_api';
import { SelectionMatchState } from './matcher/matcher';
import { createElement, createKeymapHTML, FileUploader } from '../uikit/_api';
import { EDITOR_OPTIONS, EditorOptions } from '../editor';
import { EditorController } from '../editor-controller';
import { TBSelection } from '../core/selection';
import { Commander } from '../core/_api';
import { HistoryManager } from '../history-manager';
import { makeError } from '../_utils/make-error';

export interface ToolEntity {
  config: ToolConfig;
  instance: Tool;
}

const toolErrorFn = makeError('Tool');

/**
 * 工具栏
 */
@Injectable()
export class Toolbar {
  elementRef: HTMLElement;
  onAction: Observable<ToolEntity & { params: any }>;
  config: (ToolFactory | ToolFactory[])[];
  readonly tools: ToolEntity[] = [];

  private set disabled(b: boolean) {
    if (b !== this._disabled) {
      this.tools.forEach(tool => {
        tool.instance.updateStatus({
          matchData: null,
          srcStates: [],
          state: b ? HighlightState.Disabled : HighlightState.Normal
        })
      })
    }
    this._disabled = b;
  }

  private _disabled = false;

  private actionEvent = new Subject<{ config: ToolConfig, instance: Tool, params: any }>();
  private toolWrapper: HTMLElement;
  private additionalWorktable: HTMLElement;
  private additionalWorktableContent: HTMLElement;
  private additionalWorktableClose: HTMLElement;
  private additionalWorktableCloseBtn: HTMLElement;
  private keymapPrompt: HTMLElement;

  private currentAdditionalWorktableViewer: AdditionalViewer;

  private selection: TBSelection;
  private history: HistoryManager;
  private input: Input;
  private keymaps: KeymapAction[] = [];
  private subs: Subscription[] = [];

  constructor(@Inject(forwardRef(() => EDITOR_OPTIONS)) private options: EditorOptions<any>,
              @Inject(forwardRef(() => EditorController)) private editorController: EditorController,
              @Inject(forwardRef(() => FileUploader)) private fileUploader: FileUploader,
              @Inject(forwardRef(() => Dialog)) private dialogManager: Dialog) {
    console.log('ToolBar');
    this.config = options.toolbar;

    this.onAction = this.actionEvent.asObservable();

    this.elementRef = createElement('div', {
      classes: ['textbus-toolbar'],
      children: [
        this.toolWrapper = createElement('div', {
          classes: ['textbus-toolbar-wrapper']
        }),
        this.additionalWorktable = createElement('div', {
          classes: ['textbus-toolbar-additional-worktable'],
          children: [
            this.additionalWorktableContent = createElement('div', {
              classes: ['textbus-toolbar-additional-worktable-content']
            }),
            this.additionalWorktableClose = createElement('div', {
              classes: ['textbus-toolbar-additional-worktable-close'],
              children: [
                this.additionalWorktableCloseBtn = createElement('button', {
                  attrs: {
                    type: 'button'
                  },
                  props: {
                    innerHTML: '&times;'
                  }
                })
              ]
            })
          ]
        }),
        this.keymapPrompt = createElement('div', {
          classes: ['textbus-toolbar-keymap-prompt']
        })
      ]
    })

    this.createToolbar(this.config);

    this.subs.push(
      fromEvent(this.elementRef, 'mouseover').subscribe(ev => {
        const keymap = this.findNeedShowKeymapHandler(ev.target as HTMLElement);
        if (keymap) {
          try {
            const config: Keymap = JSON.parse(keymap);
            this.keymapPrompt.innerHTML = '';
            this.keymapPrompt.append(...createKeymapHTML(config));
            this.keymapPrompt.classList.add('textbus-toolbar-keymap-prompt-show');
            return;
          } catch (e) {
            //
          }
        }
        this.keymapPrompt.classList.remove('textbus-toolbar-keymap-prompt-show');
      }),
      fromEvent(this.additionalWorktableCloseBtn, 'click').subscribe(() => {
        this.currentAdditionalWorktableViewer.destroy();
        this.additionalWorktableContent.innerHTML = '';
        this.additionalWorktable.classList.remove('textbus-toolbar-additional-worktable-show');
      }), this.editorController.onStateChange.pipe(map(s => {
        return s.readonly;
      }), distinctUntilChanged()).subscribe(b => {
        this.disabled = b;
      })
    )
  }

  setup(injector: Injector) {
    this.selection = injector.get(TBSelection);
    this.input = injector.get(Input);
    this.history = injector.get(HistoryManager);


    this.keymaps.forEach(k => this.input.addKeymap(k));
    this.subs.push(
      this.history.onChange.subscribe(() => {
        this.updateHandlerState();
      }),
      this.selection.onChange.pipe(auditTime(100)).subscribe(() => {
        const event = document.createEvent('Event');
        event.initEvent('click', true, true);
        this.elementRef.dispatchEvent(event);
        this.updateHandlerState();
      })
    )

    this.tools.forEach(tool => {
      tool.config.matcher?.setup?.(injector);
      tool.instance.commander?.setup?.(injector);
    });
  }

  destroy() {
    this.subs.forEach(s => s.unsubscribe());
    this.tools.forEach(tool => {
      tool.config.matcher?.onDestroy?.();
      tool.instance.commander?.onDestroy?.();
      tool.instance.onDestroy();
    });
  }

  private updateHandlerState() {
    if (this._disabled || !this.selection.commonAncestorFragment) {
      return;
    }
    this.tools.forEach(tool => {
      let s: SelectionMatchState;
      if (typeof tool.instance.updateStatus === 'function') {
        s = this.editorController.sourceCodeMode && !tool.config.supportSourceCodeMode ? {
          srcStates: [],
          matchData: null,
          state: HighlightState.Disabled
        } : tool.config.matcher?.queryState(this.selection) || {
          srcStates: [],
          matchData: null,
          state: HighlightState.Normal
        };
        tool.instance.updateStatus(s);
      }
    })
  }

  private findNeedShowKeymapHandler(el: HTMLElement): string {
    if (el === this.elementRef) {
      return;
    }
    if (el.dataset.keymap) {
      return el.dataset.keymap;
    }
    return this.findNeedShowKeymapHandler(el.parentNode as HTMLElement);
  }

  private createToolbar(handlers: (ToolFactory | ToolFactory[])[]) {
    if (Array.isArray(handlers)) {
      handlers.forEach(handler => {
        const group = document.createElement('span');
        group.classList.add('textbus-toolbar-group');
        if (Array.isArray(handler)) {
          this.createHandlers(handler).forEach((el: Tool) => group.appendChild(el.elementRef));
        } else {
          group.appendChild(this.createHandler(handler).elementRef);
        }
        this.toolWrapper.appendChild(group);
      });
      this.listenUserAction();
    }
  }

  private createHandlers(handlers: ToolFactory[]): Tool[] {
    return handlers.map(handler => {
      return this.createHandler(handler);
    });
  }

  private createHandler(option: ToolFactory): Tool {
    let h: Tool;
    let m: GroupHandler;
    switch (option.type) {
      case ToolType.Button:
        h = option.factory();
        break;
      case ToolType.Select:
        h = option.factory(this.toolWrapper);
        break;
      case ToolType.Dropdown:
        h = option.factory(this.toolWrapper);
        break;
      case ToolType.Form:
        h = option.factory(this.fileUploader, this.dialogManager);
        break;
      case ToolType.ActionSheet:
        h = option.factory(this.toolWrapper);
        break;
      case ToolType.Additional:
        h = option.factory();
        this.subs.push((<AdditionalHandler>h).onShow.subscribe(viewer => {
          this.currentAdditionalWorktableViewer = viewer;
          this.additionalWorktableContent.innerHTML = '';
          this.additionalWorktable.classList.add('textbus-toolbar-additional-worktable-show');
          this.additionalWorktableContent.appendChild(viewer.elementRef);
        }));
        break;
      case ToolType.Group:
        m = option.factory(this.fileUploader, this.toolWrapper, this.dialogManager);
        this.tools.push(...m.tools);
        h = m;
        break;
      default:
        throw toolErrorFn('tool type is not supported.');
    }
    if (h.keymapAction) {
      const keymaps = Array.isArray(h.keymapAction) ? h.keymapAction : [h.keymapAction];
      this.keymaps.push(...keymaps);
    }
    this.tools.push({
      config: option.config,
      instance: h
    });
    return h;
  }

  private listenUserAction() {
    this.tools.forEach(item => {
      if (item.instance.onApply instanceof Observable) {
        this.subs.push(
          item.instance.onApply.subscribe(params => {
            this.execCommand(item.config, params, item.instance.commander);
          })
        )
      }
    });
  }

  private execCommand(config: ToolConfig, params: any, commander: Commander) {
    const selection = this.selection;

    const state = config.matcher ?
      config.matcher.queryState(selection).state :
      HighlightState.Normal;
    if (state === HighlightState.Disabled) {
      return;
    }
    const overlap = state === HighlightState.Highlight;

    (this.options.plugins || []).forEach(plugin => {
      plugin.onApplyCommand?.(commander, params, newParams => {
        params = newParams;
      })
    })

    commander.command({
      selection,
      overlap,
    }, params);

    this.updateHandlerState();

    if (commander.recordHistory) {
      this.history.record();
    }
  }
}
