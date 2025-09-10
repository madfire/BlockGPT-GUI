import PropTypes from 'prop-types';
import React from 'react';
import bindAll from 'lodash.bindall';
import ScanningStepComponent from '../components/connection-modal/scanning-step.jsx';
import VM from 'openblock-vm';

class ScanningStep extends React.Component {
  constructor(props) {
    super(props);
    bindAll(this, [
      'handlePeripheralListUpdate',
      'handlePeripheralScanTimeout',
      'handleClickListAll',
      'handleRefresh',
      'scanForPeripheral',
      'stopScanningSafely'
    ]);
    this.state = {
      scanning: true,
      peripheralList: []
    };
  }

  componentDidMount() {
    // 初次进来即开始扫描（通常这一步是用户点击后的下一页，属于用户手势链路）
    this.scanForPeripheral(this.props.isListAll);
    this.props.vm.on('PERIPHERAL_LIST_UPDATE', this.handlePeripheralListUpdate);
    this.props.vm.on('PERIPHERAL_SCAN_TIMEOUT', this.handlePeripheralScanTimeout);
  }

  componentWillUnmount() {
    this.stopScanningSafely();
    this.props.vm.removeListener('PERIPHERAL_LIST_UPDATE', this.handlePeripheralListUpdate);
    this.props.vm.removeListener('PERIPHERAL_SCAN_TIMEOUT', this.handlePeripheralScanTimeout);
  }

  stopScanningSafely() {
    // 不同 openblock-vm 版本可能叫 stopScan/cancelScan；若没有此方法，请替换为你项目中的停止 API
    if (this.props.vm && typeof this.props.vm.cancelPeripheralRequests === 'function') {
      try { this.props.vm.cancelPeripheralRequests(); } catch (e) { /* noop */ }
    }
  }

  scanForPeripheral(listAll) {
    const targetId = this.props.extensionId || this.props.deviceId; // 统一入口
    this.stopScanningSafely();
    // 启动扫描
    this.props.vm.scanForPeripheral(targetId, listAll);
  }

  handlePeripheralScanTimeout() {
    this.setState({
      scanning: false,
      peripheralList: []
    });
  }

  handlePeripheralListUpdate(newList) {
    // 列表按 RSSI（若存在）从高到低，避免“跳动”
    const peripheralArray = Object.keys(newList).map(id => newList[id]);
    peripheralArray.sort((a, b) => (b.rssi ?? -Infinity) - (a.rssi ?? -Infinity));
    this.setState({ peripheralList: peripheralArray, scanning: true });
  }

  handleClickListAll() {
    const next = !this.props.isListAll;
    this.props.onClickListAll(next);
    this.setState({ scanning: true, peripheralList: [] }, () => {
      this.scanForPeripheral(next);
    });
  }

  handleRefresh() {
    this.setState({ scanning: true, peripheralList: [] }, () => {
      this.scanForPeripheral(this.props.isListAll);
    });
  }

  render() {
    // 实时（舞台）不应走串口；若你在父层有 isRealtimeMode，可在父层把 isSerialport 置为 false 再传下
    const isSerialportBool = !!this.props.isSerialport;
    const currentId = (this.props.extensionId || this.props.deviceId) || '';

    return (
      <ScanningStepComponent
        connectionSmallIconURL={this.props.connectionSmallIconURL}
        isSerialport={isSerialportBool}
        isListAll={this.props.isListAll}
        peripheralList={this.state.peripheralList}
        scanning={this.state.scanning}
        // 展示组件里这两个其实不用，但很多版本会读它们来显示标题/避免告警
        title={currentId}
        deviceId={currentId}
        onConnected={this.props.onConnected}
        onConnecting={this.props.onConnecting}
        onClickListAll={this.handleClickListAll}
        onRefresh={this.handleRefresh}
      />
    );
  }
}

ScanningStep.propTypes = {
  connectionSmallIconURL: PropTypes.string,
  // 二选一：舞台实时（extensionId）或设备（deviceId）
  extensionId: PropTypes.string,
  deviceId: PropTypes.string,
  isSerialport: PropTypes.bool.isRequired,
  isListAll: PropTypes.bool.isRequired,
  onConnected: PropTypes.func.isRequired,
  onConnecting: PropTypes.func.isRequired,
  onClickListAll: PropTypes.func.isRequired,
  vm: PropTypes.instanceOf(VM).isRequired
};

export default ScanningStep;
