import 'reflect-metadata';
import { BoldFormatter, FormatData, FormatEffect, Fragment } from '@tanbo/textbus';

describe('删除内容', () => {
  let fragment: Fragment;
  const formatter = new BoldFormatter();
  const f = {
    startIndex: 3,
    endIndex: 6,
    formatData: new FormatData(),
    effect: FormatEffect.Valid
  };

  beforeEach(() => {
    fragment = new Fragment();
    fragment.append('0123456789');
    fragment.apply(formatter, f);
  })
  test('删除前面', () => {
    const deletedContents = fragment.cut(1, 3);
    expect(fragment.getFormatRanges(formatter)[0]).toEqual({
      ...f,
      startIndex: 1,
      endIndex: 4,
    })
    expect(fragment.sliceContents(0)[0]).toBe('03456789');
    expect(deletedContents.sliceContents(0)[0]).toBe('12');
    expect(deletedContents.getFormatKeys().length).toEqual(0);
  })
  test('删除前面加中间', () => {
    const deletedContents = fragment.cut(1, 5);
    expect(fragment.getFormatRanges(formatter)[0]).toEqual({
      ...f,
      startIndex: 1,
      endIndex: 2,
    })
    expect(deletedContents.getFormatRanges(formatter)[0]).toEqual({
      ...f,
      startIndex: 2,
      endIndex: 4
    })
  });
})
