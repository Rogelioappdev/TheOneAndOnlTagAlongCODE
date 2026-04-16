import React from 'react';
import { View, Pressable, Text, Modal, StyleSheet, TouchableWithoutFeedback } from 'react-native';

interface ContextMenuRootProps {
  children: React.ReactNode;
}

interface ContextMenuTriggerProps {
  children: React.ReactNode;
}

interface ContextMenuContentProps {
  children: React.ReactNode;
}

interface ContextMenuItemProps {
  children: React.ReactNode;
  onSelect?: () => void;
  destructive?: boolean;
}

interface ContextMenuItemTitleProps {
  children: React.ReactNode;
}

interface ContextMenuItemIconProps {
  ios?: { name: string; pointSize?: number };
}

function Root({ children }: ContextMenuRootProps) {
  return <>{children}</>;
}

function Trigger({ children }: ContextMenuTriggerProps) {
  return <>{children}</>;
}

function Content({ children }: ContextMenuContentProps) {
  return null;
}

function Item({ children, onSelect, destructive }: ContextMenuItemProps) {
  return null;
}

function ItemTitle({ children }: ContextMenuItemTitleProps) {
  return null;
}

function ItemIcon(_props: ContextMenuItemIconProps) {
  return null;
}

function Separator() {
  return null;
}

export const ContextMenu = {
  Root,
  Trigger,
  Content,
  Item,
  ItemTitle,
  ItemIcon,
  Separator,
};
