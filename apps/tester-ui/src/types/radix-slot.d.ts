/**
 * Type augmentation for @radix-ui/react-slot to support React 19
 * React 19 added bigint to ReactNode, but Radix UI uses older types
 */
declare module "@radix-ui/react-slot" {
  import type * as React from "react";

  export interface SlotProps extends React.HTMLAttributes<HTMLElement> {
    children?: React.ReactNode;
  }

  export const Slot: React.ForwardRefExoticComponent<
    SlotProps & React.RefAttributes<HTMLElement>
  >;
}
