declare module 'react-window' {
  import * as React from 'react';
  export interface ListChildComponentProps {
    index: number;
    style: React.CSSProperties;
    data?: any;
  }
  export interface FixedSizeListProps {
    height: number;
    itemCount: number;
    itemSize: number;
    width: number | string;
    itemKey?: (index: number) => string;
    children: React.ComponentType<ListChildComponentProps> | ((props: ListChildComponentProps) => React.ReactNode);
  }
  export class FixedSizeList extends React.Component<FixedSizeListProps> {}
  // Fallback any export for compatibility
  export const FixedSizeList: any;
}
