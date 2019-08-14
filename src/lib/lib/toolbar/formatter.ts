import { dtd } from '../editor/dtd';

export interface RangeMarker {
  before: Range;
  current: Range;
  after: Range;
  startMark: HTMLElement;
  endMark: HTMLElement;
}

export abstract class Formatter {
  abstract readonly document: Document;

  abstract format(doc: Document): Range;

  splitBySelectedRange(range: Range, scope: Node): RangeMarker {
    const beforeRange = this.document.createRange();
    const afterRange = this.document.createRange();

    const startMark = document.createElement('span');
    const endMark = document.createElement('span');

    if (range.startContainer.nodeType === 3) {
      const startParent = range.startContainer.parentNode;
      beforeRange.setStart(range.startContainer, 0);
      beforeRange.setEnd(range.startContainer, range.startOffset);
      startParent.insertBefore(beforeRange.extractContents(), range.startContainer);
      startParent.insertBefore(startMark, range.startContainer);
      beforeRange.setStartBefore(scope);
      beforeRange.setEndBefore(startMark);
    } else if (range.startContainer.nodeType === 1) {
      beforeRange.setStartBefore(scope);
      range.startContainer.insertBefore(startMark, range.startContainer.childNodes[range.startOffset]);
      beforeRange.setEndBefore(startMark);
    }

    if (range.endContainer.nodeType === 3) {
      const nextSibling = range.endContainer.nextSibling;
      const endParent = range.endContainer.parentNode;

      afterRange.setStart(range.endContainer, range.endOffset);
      afterRange.setEndAfter(range.endContainer);

      const contents = afterRange.extractContents();
      if (nextSibling) {
        endParent.insertBefore(endMark, nextSibling);
        endParent.insertBefore(contents, nextSibling);
      } else {
        endParent.appendChild(endMark);
        endParent.appendChild(contents);
      }

      afterRange.setStartAfter(endMark);
      afterRange.setEndAfter(scope);
    } else if (range.endContainer.nodeType === 1) {
      range.endContainer.insertBefore(endMark, range.endContainer.childNodes[range.endOffset]);
      afterRange.setStartAfter(endMark);
      afterRange.setEndAfter(scope);
    }
    return {
      before: beforeRange,
      current: range,
      after: afterRange,
      startMark,
      endMark
    };
  }

  matchContainerByTagName(node: Node, tagName: string, scope: Node) {
    while (node) {
      if (node === scope) {
        return null;
      }
      if (node.nodeType === 1 && (node as HTMLElement).tagName.toLowerCase() === tagName) {
        return node;
      }
      node = node.parentNode as HTMLElement;
    }
    return null;
  }

  findEmptyContainer(node: Node): Node {
    if ((node.parentNode as HTMLElement).innerText) {
      return node;
    }
    return this.findEmptyContainer(node.parentNode);
  }

  createContainerByDtdRule(tagName: string): { newNode: HTMLElement, contentsContainer: HTMLElement } {
    const wrapper = this.document.createElement(tagName);
    let container = wrapper;
    while (dtd[container.tagName.toLowerCase()].limitChildren) {
      const child = this.document.createElement(dtd[container.tagName.toLowerCase()].limitChildren[0]);
      container.appendChild(child);
      container = child;
    }
    return {
      contentsContainer: wrapper,
      newNode: container
    };
  }

  findBlockContainer(node: Node, scope: HTMLElement): Node {
    if (node === scope) {
      return node;
    }

    if (node.nodeType === 3) {
      return this.findBlockContainer(node.parentNode, scope);
    }
    if (node.nodeType === 1) {
      const tagName = (node as HTMLElement).tagName.toLowerCase();
      if (dtd[tagName].display === 'block') {
        return node;
      }
      if (node.parentNode) {
        return this.findBlockContainer(node.parentNode, scope);
      }
    }
    return scope;
  }
}