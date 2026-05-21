import React from 'react';
import { Modal, type ModalProps } from './Modal';

type ConfirmDialogProps = Omit<ModalProps, 'children'> & {
  children?: React.ReactNode;
};

export function ConfirmDialog(props: ConfirmDialogProps) {
  return <Modal {...props}>{props.children}</Modal>;
}
