import * as React from 'react';
import Animate from 'rc-animate';
import classNames from 'classnames';
import { UploadListProps, UploadFile, UploadListType } from './interface';
import { previewImage, isImageUrl } from './utils';
import Icon from '../icon';
import Tooltip from '../tooltip';
import Progress from '../progress';
import { ConfigConsumer, ConfigConsumerProps } from '../config-provider';

export default class UploadList extends React.Component<UploadListProps, any> {
  static defaultProps = {
    listType: 'text' as UploadListType, // or picture
    progressAttr: {
      strokeWidth: 2,
      showInfo: false,
    },
    showRemoveIcon: true,
    showPreviewIcon: true,
    previewFile: previewImage,
  };

  componentDidUpdate() {
    const { listType, items, previewFile } = this.props;
    if (listType !== 'picture' && listType !== 'picture-card') {
      return;
    }
    (items || []).forEach(file => {
      const isValidateFile =
        file.originFileObj instanceof File || file.originFileObj instanceof Blob;

      if (
        typeof document === 'undefined' ||
        typeof window === 'undefined' ||
        !(window as any).FileReader ||
        !(window as any).File ||
        !isValidateFile ||
        file.thumbUrl !== undefined
      ) {
        return;
      }
      file.thumbUrl = '';
      if (previewFile) {
        previewFile(file.originFileObj as File).then((previewDataUrl: string) => {
          // Need append '' to avoid dead loop
          file.thumbUrl = previewDataUrl || '';
          this.forceUpdate();
        });
      }
    });
  }

  handlePreview = (file: UploadFile, e: React.SyntheticEvent<HTMLElement>) => {
    const { onPreview } = this.props;
    if (!onPreview) {
      return;
    }
    e.preventDefault();
    return onPreview(file);
  };

  handleClose = (file: UploadFile) => {
    const { onRemove } = this.props;
    if (onRemove) {
      onRemove(file);
    }
  };

  renderUploadList = ({ getPrefixCls }: ConfigConsumerProps) => {
    const {
      prefixCls: customizePrefixCls,
      items = [],
      listType,
      showPreviewIcon,
      showRemoveIcon,
      locale,
      progressAttr,
    } = this.props;
    const prefixCls = getPrefixCls('upload', customizePrefixCls);
    const list = items.map(file => {
      let progress;
      let icon = <Icon type={file.status === 'uploading' ? 'loading' : 'paper-clip'} />;

      if (listType === 'picture' || listType === 'picture-card') {
        if (listType === 'picture-card' && file.status === 'uploading') {
          icon = <div className={`${prefixCls}-list-item-uploading-text`}>{locale.uploading}</div>;
        } else if (!file.thumbUrl && !file.url) {
          icon = (
            <Icon className={`${prefixCls}-list-item-thumbnail`} type="picture" theme="twoTone" />
          );
        } else {
          const thumbnail = isImageUrl(file) ? (
            <img
              src={file.thumbUrl || file.url}
              alt={file.name}
              className={`${prefixCls}-list-item-image`}
            />
          ) : (
            <Icon type="file" className={`${prefixCls}-list-item-icon`} theme="twoTone" />
          );
          icon = (
            <a
              className={`${prefixCls}-list-item-thumbnail`}
              onClick={e => this.handlePreview(file, e)}
              href={file.url || file.thumbUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              {thumbnail}
            </a>
          );
        }
      }

      if (file.status === 'uploading') {
        // show loading icon if upload progress listener is disabled
        const loadingProgress =
          'percent' in file ? (
            <Progress type="line" {...progressAttr} percent={file.percent} />
          ) : null;

        progress = (
          <div className={`${prefixCls}-list-item-progress`} key="progress">
            {loadingProgress}
          </div>
        );
      }
      const infoUploadingClass = classNames({
        [`${prefixCls}-list-item`]: true,
        [`${prefixCls}-list-item-${file.status}`]: true,
      });
      const linkProps =
        typeof file.linkProps === 'string' ? JSON.parse(file.linkProps) : file.linkProps;
      const preview = file.url ? (
        <a
          target="_blank"
          rel="noopener noreferrer"
          className={`${prefixCls}-list-item-name`}
          title={file.name}
          {...linkProps}
          href={file.url}
          onClick={e => this.handlePreview(file, e)}
        >
          {file.name}
        </a>
      ) : (
        <span
          className={`${prefixCls}-list-item-name`}
          onClick={e => this.handlePreview(file, e)}
          title={file.name}
        >
          {file.name}
        </span>
      );
      const style: React.CSSProperties = {
        pointerEvents: 'none',
        opacity: 0.5,
      };
      const previewIcon = showPreviewIcon ? (
        <a
          href={file.url || file.thumbUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={file.url || file.thumbUrl ? undefined : style}
          onClick={e => this.handlePreview(file, e)}
          title={locale.previewFile}
        >
          <Icon type="eye-o" />
        </a>
      ) : null;
      const removeIcon = showRemoveIcon ? (
        <Icon type="delete" title={locale.removeFile} onClick={() => this.handleClose(file)} />
      ) : null;
      const removeIconClose = showRemoveIcon ? (
        <Icon type="close" title={locale.removeFile} onClick={() => this.handleClose(file)} />
      ) : null;
      const actions =
        listType === 'picture-card' && file.status !== 'uploading' ? (
          <span className={`${prefixCls}-list-item-actions`}>
            {previewIcon}
            {removeIcon}
          </span>
        ) : (
          removeIconClose
        );
      let message;
      if (file.response && typeof file.response === 'string') {
        message = file.response;
      } else {
        message = (file.error && file.error.statusText) || locale.uploadError;
      }
      const iconAndPreview =
        file.status === 'error' ? (
          <Tooltip title={message}>
            {icon}
            {preview}
          </Tooltip>
        ) : (
          <span>
            {icon}
            {preview}
          </span>
        );

      return (
        <div className={infoUploadingClass} key={file.uid}>
          <div className={`${prefixCls}-list-item-info`}>{iconAndPreview}</div>
          {actions}
          <Animate transitionName="fade" component="">
            {progress}
          </Animate>
        </div>
      );
    });
    const listClassNames = classNames({
      [`${prefixCls}-list`]: true,
      [`${prefixCls}-list-${listType}`]: true,
    });
    const animationDirection = listType === 'picture-card' ? 'animate-inline' : 'animate';
    return (
      <Animate
        transitionName={`${prefixCls}-${animationDirection}`}
        component="div"
        className={listClassNames}
      >
        {list}
      </Animate>
    );
  };

  render() {
    return <ConfigConsumer>{this.renderUploadList}</ConfigConsumer>;
  }
}
