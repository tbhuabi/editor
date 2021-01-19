import { Observable, Subject } from 'rxjs';

import { FormItem, FileUploader } from './help';
import { FormViewer } from '../../toolbar/toolkit/_api';
import { FormatAbstractData, BranchAbstractComponent, LeafAbstractComponent } from '../../core/_api';
import { createElement, createTextNode } from '../uikit';

export interface FormConfig {
  title?: string;
  items: Array<FormItem>;
  mini?: boolean;
}

export class Form implements FormViewer {
  onComplete: Observable<Map<string, any>>;
  onClose: Observable<void>;

  readonly elementRef: HTMLFormElement;
  private completeEvent = new Subject<Map<string, any>>();
  private closeEvent = new Subject<void>();
  private footer: HTMLElement;
  private groups: HTMLElement;

  constructor(private config: FormConfig) {
    this.onComplete = this.completeEvent.asObservable();
    this.onClose = this.closeEvent.asObservable();
    this.elementRef = createElement('form', {
      classes: [config.mini ? 'textbus-toolbar-form' : 'textbus-form'],
      attrs: {
        novalidate: true,
        autocomplete: 'off'
      }
    }) as HTMLFormElement;
    if (config.title) {
      this.elementRef.appendChild(createElement('h3', {
        classes: ['textbus-form-title'],
        children: [createTextNode(config.title)]
      }))
    }
    this.elementRef.appendChild(this.groups = createElement('div', {
      classes: config.mini ? [] : ['textbus-form-body'],
      children: config.items.map(item => {
        return item.elementRef;
      })
    }));

    this.elementRef.setAttribute('novalidate', 'novalidate');

    const btns = config.mini ? [
      createElement('button', {
        attrs: {
          type: 'submit'
        },
        classes: ['textbus-btn', 'textbus-btn-block', 'textbus-btn-primary'],
        children: [createTextNode('确定')]
      })
    ] : [
      createElement('button', {
        attrs: {
          type: 'submit'
        },
        classes: ['textbus-btn', 'textbus-btn-primary'],
        children: [createTextNode('确定')]
      }),
      (() => {
        const cancelBtn = createElement('button', {
          classes: ['textbus-btn', 'textbus-btn-default'],
          attrs: {
            type: 'button'
          },
          children: [createTextNode('取消')]
        })
        cancelBtn.addEventListener('click', () => {
          this.closeEvent.next();
        })
        return cancelBtn;
      })()
    ];
    this.elementRef.appendChild(this.footer = createElement('div', {
      classes: ['textbus-form-footer'],
      children: btns
    }));

    this.elementRef.addEventListener('submit', (ev: Event) => {
      ev.preventDefault();

      const map = new Map<string, any>();
      for (const item of config.items) {
        if (!item.validate()) {
          return;
        }
        const i = item.getAttr();
        map.set(i.name, i.value);
      }
      this.completeEvent.next(map);
    });
  }

  addItem(item: FormItem, index?: number) {
    if (typeof index === 'number') {
      const next = this.config.items[index];
      if (next) {
        this.config.items.splice(index, 0, item);
        this.elementRef.insertBefore(item.elementRef, next.elementRef);
        return
      }
    }
    this.config.items.push(item);
    this.groups.appendChild(item.elementRef);
  }

  removeItem(item: FormItem) {
    const index = this.config.items.indexOf(item);
    if (index > -1) {
      this.config.items.splice(index, 1);
      item.elementRef.parentNode?.removeChild(item.elementRef);
    }
  }

  reset(): void {
    this.config.items.forEach(item => {
      item.reset();
    });
  }

  setFileUploader(fileUploader: FileUploader): void {
    this.config.items.forEach(item => {
      if (typeof item.useUploader === 'function') {
        item.useUploader(fileUploader);
      }
    })
  }

  update(d: FormatAbstractData | BranchAbstractComponent | LeafAbstractComponent): void {
    this.config.items.forEach(item => {
      const value = d ? d instanceof FormatAbstractData ? d.attrs.get(item.name) : d[item.name] : null;
      item.update(value);
    });
  }
}
