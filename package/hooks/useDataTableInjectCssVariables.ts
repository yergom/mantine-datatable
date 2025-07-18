import { RefObject, useEffect, useRef } from 'react';
import { VAR_FOOTER_HEIGHT, VAR_HEADER_HEIGHT, VAR_SELECTION_COLUMN_WIDTH } from '../cssVariables';
import { DataTableScrollProps } from '../types/DataTableScrollProps';
import { useIsomorphicLayoutEffect } from './useIsomorphicLayoutEffect';
import { useStableValue } from './useStableValue';

interface UseDataTableInjectCssVariablesOpts {
  root: RefObject<HTMLDivElement | null>;
  table: RefObject<HTMLTableElement | null>;
  scrollViewport: RefObject<HTMLElement | null>;
  header: RefObject<HTMLTableSectionElement | null>;
  footer: RefObject<HTMLTableSectionElement | null>;
  selectionColumnHeader: RefObject<HTMLTableCellElement | null>;
  scrollCallbacks: DataTableScrollProps;
  fetching: boolean | undefined;
}

type OnScroll = NonNullable<DataTableScrollProps["onScroll"]>;

/**
 * The idea is that we are going to inject CSS variables into the root, so that they can be used in css stylings for the different table section,
 * without causing a reeact re-render
 */
type Rect = {
  width: number;
  height: number;
};

function setCssVar(root: HTMLDivElement | null, name: string, value: string) {
  root?.style.setProperty(name, value);
}

function getRect(entry: ResizeObserverEntry): Rect {
  const boxSize = entry.borderBoxSize?.[0] || entry.contentBoxSize?.[0];
  if (boxSize) {
    return {
      width: boxSize.inlineSize,
      height: boxSize.blockSize,
    };
  } else {
    return { width: entry.contentRect.width, height: entry.contentRect.height };
  }
}

function observe(elem: HTMLElement | null, onChange: (rect: Rect) => unknown, onCancel: () => unknown) {
  if (elem) {
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        onChange(getRect(entry));
      }
    });
    observer.observe(elem);
    return () => {
      observer.disconnect();
      onCancel();
    };
  }
}

type Pos = 'top' | 'bottom' | 'left' | 'right';

export function useDataTableInjectCssVariables({
  root,
  table,
  scrollViewport,
  header,
  footer,
  selectionColumnHeader,
  fetching,
  scrollCallbacks,
}: UseDataTableInjectCssVariablesOpts) {
  const stableScrollCallbacks = useStableValue(scrollCallbacks);
  const onScrollRef = useRef<OnScroll>(() => void 0);

  useEffect(() => {
    return observe(
      header.current,
      (rect) => {
        setCssVar(root.current, VAR_HEADER_HEIGHT, `${rect.height}px`);
      },
      () => setCssVar(root.current, VAR_HEADER_HEIGHT, '0px')
    );
  }, [header.current]);

  useEffect(() => {
    return observe(
      footer.current,
      (rect) => {
        setCssVar(root.current, VAR_FOOTER_HEIGHT, `${rect.height}px`);
      },
      () => setCssVar(root.current, VAR_FOOTER_HEIGHT, '0px')
    );
  }, [footer.current]);

  useEffect(() => {
    return observe(
      selectionColumnHeader.current,
      (rect) => {
        setCssVar(root.current, VAR_SELECTION_COLUMN_WIDTH, `${rect.width}px`);
      },
      () => setCssVar(root.current, VAR_SELECTION_COLUMN_WIDTH, '0px')
    );
  }, [selectionColumnHeader.current]);

  useIsomorphicLayoutEffect(() => {
    if (typeof window === undefined) {
      return;
    }
    const scrollPosition: Record<Pos, boolean> = {
      top: false,
      bottom: false,
      left: false,
      right: false,
    };
    let tableRect: Rect = { width: 0, height: 0 };
    let scrollRect: Rect = { width: 0, height: 0 };

    function setScrolledTo(pos: Pos, value: boolean) {
      const old = scrollPosition[pos];
      scrollPosition[pos] = value;
      setCssVar(root.current, `--mantine-datatable-${pos}-shadow-opacity`, value ? '0' : '1');
      return old;
    }


    function processScrolling() {
      const callbacks = stableScrollCallbacks.current;
      const scrollTop = scrollViewport.current?.scrollTop ?? 0;
      const scrollLeft = scrollViewport.current?.scrollLeft ?? 0;
      if (fetching || tableRect.height <= scrollRect.height) {
        setScrolledTo('top', true);
        setScrolledTo('bottom', true);
      } else {
        const newScrolledToTop = scrollTop === 0;
        const newScrolledToBottom = tableRect.height - scrollTop - scrollRect.height < 1;

        const scrolledToTop = setScrolledTo('top', newScrolledToTop);
        const scrolledToBottom = setScrolledTo('bottom', newScrolledToBottom);
        if (newScrolledToTop && newScrolledToTop !== scrolledToTop) callbacks.onScrollToTop?.();
        if (newScrolledToBottom && newScrolledToBottom !== scrolledToBottom) callbacks.onScrollToBottom?.();
      }
      if (fetching || tableRect.width === scrollRect.width) {
        setScrolledTo('left', true);
        setScrolledTo('right', true);
      } else {
        const newScrolledToLeft = scrollLeft === 0;
        const newScrolledToRight = tableRect.width - scrollLeft - scrollRect.width < 1;
        const scrolledToLeft = setScrolledTo('left', newScrolledToLeft);
        const scrolledToRight = setScrolledTo('right', newScrolledToRight);
        if (newScrolledToLeft && newScrolledToLeft !== scrolledToLeft) callbacks.onScrollToLeft?.();
        if (newScrolledToRight && newScrolledToRight !== scrolledToRight) callbacks.onScrollToRight?.();
      }
    }

    const onScroll: OnScroll = (e)=>{
      stableScrollCallbacks.current.onScroll?.(e);
      processScrolling()
    }

    onScrollRef.current = onScroll;

    const observer = new ResizeObserver(([table, scrollViewport]) => {
      tableRect = getRect(table);
      scrollRect = getRect(scrollViewport);
      processScrolling();
    });

    observer.observe(table.current!);
    observer.observe(scrollViewport.current!);

    return () => {
      observer.disconnect();
    };
  }, [fetching]);

  return { onScroll: onScrollRef.current };
}
