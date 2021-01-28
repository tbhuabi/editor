import { Injectable } from '@tanbo/di';
import { fromEvent, Subscription } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';

import { createElement, createTextNode } from '../uikit/uikit';
import { EditorController } from '../editor-controller';

/**
 * 组件库开关类
 */
@Injectable()
export class LibSwitch {
  elementRef = createElement('button', {
    attrs: {
      type: 'button',
      title: '展开或收起组件库',
    },
    classes: ['textbus-status-bar-btn'],
    children: [
      createElement('span', {
        classes: ['textbus-icon-components']
      }),
      createTextNode(' 组件库')
    ]
  }) as HTMLButtonElement;

  set disabled(b: boolean) {
    this._disabled = b;
    this.elementRef.disabled = b;
    if (b) {
      this.expand = false;
      this.elementRef.classList.remove('textbus-status-bar-btn-active');
    }
  }

  get disabled() {
    return this._disabled;
  }

  set expand(b: boolean) {
    this._expand = b;
    if (b) {
      this.elementRef.classList.add('textbus-status-bar-btn-active');
    } else {
      this.elementRef.classList.remove('textbus-status-bar-btn-active');
    }
  }

  get expand() {
    return this._expand;
  }

  private _disabled = false;
  private _expand = false;

  private subs: Subscription[] = [];

  constructor(private editorController: EditorController) {
    console.log('Lib-switch');
    this.subs.push(
      fromEvent(this.elementRef, 'click').subscribe(() => {
        this.expand = !this.expand;
        editorController.expandComponentLibrary = this.expand;
      }),
      editorController.onStateChange.pipe(map(s => {
        this.disabled = editorController.sourceCodeMode;
        return s.expandComponentLibrary;
      }), distinctUntilChanged()).subscribe(b => {
        this.expand = b;
      })
    )
  }

  destroy() {
    this.subs.forEach(s => s.unsubscribe());
  }
}
