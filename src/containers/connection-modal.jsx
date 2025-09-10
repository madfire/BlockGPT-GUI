import PropTypes from 'prop-types';
import React from 'react';
import bindAll from 'lodash.bindall';
import ConnectionModalComponent, {PHASES} from '../components/connection-modal/connection-modal.jsx';
import VM from 'openblock-vm';
import analytics from '../lib/analytics';
import extensionData from '../lib/libraries/extensions/index.jsx';
import {connect} from 'react-redux';
import {closeConnectionModal} from '../reducers/modals';
import {setConnectionModalPeripheralName} from '../reducers/connection-modal';

class ConnectionModal extends React.Component {
  constructor (props) {
    super(props);
    bindAll(this, [
      'handleScanning',
      'handleCancel',
      'handleConnected',
      'handleConnecting',
      'handleDisconnect',
      'handleError',
      'handleHelp'
    ]);

    const targetId = props.extensionId || props.deviceId;
    const extension = props.extensionId
      ? extensionData.find(ext => ext.extensionId === props.extensionId)
      : props.devicedata.find(dev => dev.deviceId === props.deviceId);

    this.state = {
      extension,
      phase: props.vm.getPeripheralIsConnected(targetId) ? PHASES.connected : PHASES.scanning,
      peripheralName: null,
      errorMessage: null
    };
  }

  componentDidMount () {
    this.props.vm.on('PERIPHERAL_CONNECTED', this.handleConnected);
    this.props.vm.on('PERIPHERAL_REQUEST_ERROR', this.handleError);
  }
  componentWillUnmount () {
    this.props.vm.removeListener('PERIPHERAL_CONNECTED', this.handleConnected);
    this.props.vm.removeListener('PERIPHERAL_REQUEST_ERROR', this.handleError);
  }

  handleScanning () {
    this.setState({ phase: PHASES.scanning });
  }

  handleConnecting (peripheralId, peripheralName) {
    const targetId = this.props.extensionId || this.props.deviceId;

    if (this.props.isRealtimeMode) {
      // 实时：统一走 Web-BLE
      this.props.vm.connectPeripheral(targetId, peripheralId);
    } else {
      // 非实时：仅设备串口需要波特率
      this.props.vm.connectPeripheral(this.props.deviceId, peripheralId, parseInt(this.props.baudrate, 10));
    }

    this.setState({ phase: PHASES.connecting, peripheralName });
    analytics.event({ category: 'devices', action: 'connecting', label: targetId });
  }

  handleDisconnect () {
    const targetId = this.props.extensionId || this.props.deviceId;
    try {
      this.props.vm.disconnectPeripheral(targetId);
    } finally {
      this.props.onCancel();
    }
  }

  handleCancel () {
    const targetId = this.props.extensionId || this.props.deviceId;
    try {
      if (!this.props.vm.getPeripheralIsConnected(targetId)) {
        this.props.vm.disconnectPeripheral(targetId); // 停止扫描/清理
      }
    } finally {
      this.props.onCancel();
    }
  }

  handleError (err) {
    if (this.state.phase === PHASES.scanning || this.state.phase === PHASES.unavailable) {
      this.setState({ phase: PHASES.unavailable });
    } else {
      this.setState({ phase: PHASES.error, errorMessage: err?.message });
      analytics.event({
        category: 'devices',
        action: 'connecting error',
        label: this.props.extensionId || this.props.deviceId
      });
    }
  }

  handleConnected () {
    this.setState({ phase: PHASES.connected });
    analytics.event({
      category: 'devices',
      action: 'connected',
      label: this.props.extensionId || this.props.deviceId
    });
    this.props.onConnected(this.state.peripheralName);
  }

  handleHelp () {
    if (this.state.extension?.helpLink) window.open(this.state.extension.helpLink, '_blank');
    analytics.event({
      category: 'devices',
      action: 'device help',
      label: this.props.extensionId || this.props.deviceId
    });
  }

  render () {
    const targetId = this.props.extensionId || this.props.deviceId;
    const isSerialport = !!(this.state.extension?.serialportRequired && !this.props.isRealtimeMode);

    return (
      <ConnectionModalComponent
        connectingMessage={this.state.extension && this.state.extension.connectingMessage}
        connectionIconURL={this.state.extension && this.state.extension.connectionIconURL}
        connectionSmallIconURL={this.state.extension && this.state.extension.connectionSmallIconURL}
        isSerialport={isSerialport}                   // 实时模式会变成 false
        connectionTipIconURL={this.state.extension && this.state.extension.connectionTipIconURL}
        extensionId={targetId}                        // 统一透传
        name={this.state.extension && this.state.extension.name}
        phase={this.state.phase}
        title={targetId || 'Connect to device'}       // 避免 null 警告
        useAutoScan={(this.state.extension && this.state.extension.useAutoScan) ?? true}
        vm={this.props.vm}
        onCancel={this.handleCancel}
        onConnected={this.handleConnected}
        onConnecting={this.handleConnecting}
        onDisconnect={this.handleDisconnect}
        onHelp={this.handleHelp}
        onScanning={this.handleScanning}
      />
    );
  }
}

ConnectionModal.propTypes = {
  extensionId: PropTypes.string,                 // 二选一即可
  deviceId: PropTypes.string,                    // 二选一即可
  baudrate: PropTypes.string,                    // 非实时串口才需要
  devicedata: PropTypes.instanceOf(Array).isRequired,
  isRealtimeMode: PropTypes.bool,
  onCancel: PropTypes.func.isRequired,
  onConnected: PropTypes.func.isRequired,
  vm: PropTypes.instanceOf(VM).isRequired
};

const mapStateToProps = state => ({
  baudrate: state.scratchGui.hardwareConsole.baudrate,
  devicedata: state.scratchGui.deviceData.deviceData,
  deviceId: state.scratchGui.device.deviceId,
  extensionId: state.scratchGui.connectionModal.extensionId,
  isRealtimeMode: state.scratchGui.programMode.isRealtimeMode
});

const mapDispatchToProps = dispatch => ({
  onCancel: () => dispatch(closeConnectionModal()),
  onConnected: peripheralName => dispatch(setConnectionModalPeripheralName(peripheralName))
});

export default connect(mapStateToProps, mapDispatchToProps)(ConnectionModal);
