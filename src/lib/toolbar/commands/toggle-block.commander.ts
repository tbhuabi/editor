import {
  Commander,
  CommandContext
} from '../../core/_api';
import { BlockComponent } from '../../components/block.component';

export class ToggleBlockCommander implements Commander<null> {
  recordHistory = true;

  constructor(private tagName: string) {
  }

  command(context: CommandContext) {
    const {selection, overlap} = context;
    selection.ranges.forEach(range => {
      if (overlap) {
        const context = range.commonAncestorFragment.getContext(
          BlockComponent,
          instance => {
            return instance.tagName === this.tagName;
          });
        const parentFragment = context.parentFragment;
        const position = parentFragment.indexOf(context);
        parentFragment.cut(position, 1);
        const fragment = context.slot;
        const contents = fragment.cut(0);
        contents.sliceContents(0).reverse().forEach(i => parentFragment.insert(i, position));
        Array.from(contents.getFormatKeys()).forEach(token => {
          contents.getFormatRanges(token).forEach(f => {
            parentFragment.apply(token, {
              ...f,
              startIndex: f.startIndex + position,
              endIndex: f.endIndex + position
            })
          })
        })
      } else {
        const block = new BlockComponent(this.tagName);
        const fragment = block.slot;
        if (range.startFragment === range.endFragment) {
          const parentComponent = range.startFragment.parentComponent
          let parentFragment = parentComponent.parentFragment;
          const position = parentFragment.indexOf(parentComponent);
          fragment.append(parentComponent);
          parentFragment.insert(block, position);
        } else {
          const commonAncestorFragment = range.commonAncestorFragment;
          const scope = range.getCommonAncestorFragmentScope();
          fragment.from(commonAncestorFragment.cut(scope.startIndex, scope.endIndex - scope.startIndex));
          commonAncestorFragment.insert(block, scope.startIndex);
        }
      }
    })
  }
}
