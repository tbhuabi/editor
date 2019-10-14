import { Observable } from 'rxjs';

import { Formatter } from './formatter';
import { TBRange } from '../../range';
import { EditFrame } from '../edit-frame';
import { MatchDelta } from '../../matcher';
import { AttrState } from '../../formats/forms/help';

export class AttrFormatter implements Formatter {
  readonly recordHistory = true;
  private attrs: AttrState[] = [];

  constructor(private tagName: string,
              attrs: AttrState[] | Observable<AttrState[]>,
              private containsChild = false) {
    if (attrs instanceof Observable) {
      attrs.subscribe(r => {
        this.attrs = r;
      })
    } else {
      this.attrs = attrs;
    }
  }

  format(range: TBRange, frame: EditFrame, matchDelta: MatchDelta): void {
    function setAttr(el: HTMLElement, attr: AttrState) {
      const isBooleanValue = typeof attr.value === 'boolean';
      let value = attr.value;
      if (isBooleanValue) {
        if (attr.value) {
          value = attr.name;
        } else {
          return;
        }
      }
      el.setAttribute(attr.name, value + '');
    }

    if (matchDelta.inSingleContainer) {
      this.attrs.forEach(item => {
        setAttr(matchDelta.scopeContainer as HTMLElement, item);
      });
    } else if (matchDelta.overlap) {
      const c = (range.commonAncestorContainer as HTMLElement).children[0] as HTMLElement;
      this.attrs.forEach(item => {
        setAttr(c, item);
      });
    } else {
      const container = frame.contentDocument.createElement(this.tagName);
      this.attrs.forEach(item => {
        setAttr(container, item);
      });
      if (!this.containsChild) {
        range.rawRange.collapse();
        range.rawRange.insertNode(container);
      } else {
        range.rawRange.surroundContents(container);
      }
    }
  }
}
