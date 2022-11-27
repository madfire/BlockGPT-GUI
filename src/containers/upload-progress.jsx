import PropTypes from 'prop-types';
import React from 'react';
import bindAll from 'lodash.bindall';

import {connect} from 'react-redux';
import {compose} from 'redux';
import {injectIntl, intlShape, defineMessages} from 'react-intl';

import VM from 'openblock-vm';
import analytics from '../lib/analytics';
import {closeUploadProgress} from '../reducers/modals';
import {showAlertWithTimeout} from '../reducers/alerts';

import UploadProgressComponent, {PHASES} from '../components/upload-progress/upload-progress.jsx';

const messages = defineMessages({
    uploadErrorMessage: {
        defaultMessage: 'Upload error',
        description: 'Prompt for upload error',
        id: 'gui.uploadProgress.uploadErrorMessage'
    },
    uploadTimeout: {
        defaultMessage: 'Upload timeout',
        description: 'Prompt for upload timeout',
        id: 'gui.uploadProgress.uploadTimeoutMessage'
    }
});

// 60s
const UPLOAD_TIMEOUT_TIME = 60 * 1000;

class UploadProgress extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleAbort',
            'handleCancel',
            'handleHelp',
            'handleSetUploadAbortEnabled',
            'handleStdout',
            'handleUploadError',
            'handleUploadSuccess',
            'handleUploadTimeout'
        ]);
        this.state = {
            extension: this.props.deviceData.find(dev => dev.deviceId === props.deviceId),
            phase: PHASES.uploading,
            peripheralName: null,
            abortEnabled: false,
            text: ''
        };
        // if the upload progress stack some seconds with out any info.
        // set state to timeout let user could colse the modal.
        this.uploadTimeout = setTimeout(() => this.handleUploadTimeout(), UPLOAD_TIMEOUT_TIME);
        analytics.event({
            category: 'devices',
            action: 'uploading',
            label: this.props.deviceId
        });
    }
    componentDidMount () {
        this.props.vm.on('PERIPHERAL_UPLOAD_STDOUT', this.handleStdout);
        this.props.vm.on('PERIPHERAL_UPLOAD_ERROR', this.handleUploadError);
        this.props.vm.on('PERIPHERAL_CONNECTION_LOST_ERROR', this.handleUploadError);
        this.props.vm.on('PERIPHERAL_UPLOAD_SUCCESS', this.handleUploadSuccess);
        this.props.vm.on('PERIPHERAL_SET_UPLOAD_ABORT_ENABLED', this.handleSetUploadAbortEnabled);
    }
    componentWillUnmount () {
        this.props.vm.removeListener('PERIPHERAL_UPLOAD_STDOUT', this.handleStdout);
        this.props.vm.removeListener('PERIPHERAL_UPLOAD_ERROR', this.handleUploadError);
        this.props.vm.removeListener('PERIPHERAL_CONNECTION_LOST_ERROR', this.handleUploadError);
        this.props.vm.removeListener('PERIPHERAL_UPLOAD_SUCCESS', this.handleUploadSuccess);
        this.props.vm.removeListener('PERIPHERAL_SET_UPLOAD_ABORT_ENABLED', this.handleSetUploadAbortEnabled);
        clearTimeout(this.uploadTimeout);
    }
    handleAbort () {
        this.props.vm.abortUploadToPeripheral(this.props.deviceId);
        clearTimeout(this.uploadTimeout);
    }
    handleCancel () {
        this.props.oncloseUploadProgress();
    }
    handleHelp () {
        window.open(this.state.extension.helpLink, '_blank');
        analytics.event({
            category: 'devices',
            action: 'upload help',
            label: this.props.deviceId
        });
    }
    handleStdout (data) {
        this.setState({
            text: this.state.text + data.message
        });
        clearTimeout(this.uploadTimeout);
        this.uploadTimeout = setTimeout(() => this.handleUploadTimeout(), UPLOAD_TIMEOUT_TIME);
    }
    handleSetUploadAbortEnabled (enabled) {
        if (enabled) {
            this.setState({abortEnabled: true});
        } else {
            this.setState({abortEnabled: false});
        }
    }
    handleUploadError (data) {
        // if the upload progress has been in success don't handle the upload error.
        if (this.state.phase !== PHASES.success){
            this.setState({
                text: `${this.state.text + data.message}\r\n` +
                    `${this.props.intl.formatMessage(messages.uploadErrorMessage)}`,
                phase: PHASES.error
            });
            this.props.onUploadError();
            analytics.event({
                category: 'devices',
                action: 'upload error',
                label: this.props.deviceId
            });
            clearTimeout(this.uploadTimeout);
        }
    }
    handleUploadSuccess () {
        this.setState({
            phase: PHASES.success
        });
        this.props.onUploadSuccess();
        this.handleCancel();
        clearTimeout(this.uploadTimeout);
    }
    handleUploadTimeout () {
        this.setState({
            text: `${this.state.text}\r\n${this.props.intl.formatMessage(messages.uploadTimeout)}`,
            phase: PHASES.timeout
        });
        this.props.onUploadError();
        analytics.event({
            category: 'devices',
            action: 'upload timeout',
            label: this.props.deviceId
        });
        clearTimeout(this.uploadTimeout);
    }

    render () {
        return (
            <UploadProgressComponent
                connectionSmallIconURL={this.state.extension && this.state.extension.connectionSmallIconURL}
                name={this.state.extension && this.state.extension.name}
                abortEnabled={this.state.abortEnabled}
                onAbort={this.handleAbort}
                onCancel={this.handleCancel}
                onHelp={this.handleHelp}
                text={this.state.text}
                phase={this.state.phase}
            />
        );
    }
}

UploadProgress.propTypes = {
    deviceData: PropTypes.instanceOf(Array).isRequired,
    deviceId: PropTypes.string.isRequired,
    intl: intlShape.isRequired,
    vm: PropTypes.instanceOf(VM).isRequired,
    oncloseUploadProgress: PropTypes.func.isRequired,
    onUploadError: PropTypes.func.isRequired,
    onUploadSuccess: PropTypes.func.isRequired
};

const mapStateToProps = state => ({
    deviceData: state.scratchGui.deviceData.deviceData,
    deviceId: state.scratchGui.device.deviceId
});

const mapDispatchToProps = dispatch => ({
    oncloseUploadProgress: () => dispatch(closeUploadProgress()),
    onUploadError: () => showAlertWithTimeout(dispatch, 'uploadError'),
    onUploadSuccess: () => showAlertWithTimeout(dispatch, 'uploadSuccess')
});

export default compose(
    injectIntl,
    connect(
        mapStateToProps,
        mapDispatchToProps
    )
)(UploadProgress);
