import PropTypes from 'prop-types';
import React from 'react';
import bindAll from 'lodash.bindall';
import AutoScanningComponent, { PHASES } from '../components/connection-modal/auto-scanning-step.jsx';
import VM from 'openblock-vm';

class AutoScanningStep extends React.Component {
  constructor(props) {
    super(props);
    bindAll(this, [
      'handlePeripheralListUpdate',
      'handlePeripheralScanTimeout',
      'handleStartScan',
      'handleRefresh',
      'bindPeripheralUpdates',
      'unbindPeripheralUpdates',
      'stopScanningSafely'
    ]);
    this.state = { phase: PHASES.prescan };
    this._listening = false;
    this._uiTimeout = null;
  }

  componentWillUnmount() {
    this.stopScanningSafely();
    this.unbindPeripheralUpdates();
    if (this._uiTimeout) clearTimeout(this._uiTimeout);
  }

  stopScanningSafely() {
    // openblock-vm 常见的停止 API；若你项目名不同，替换为 stopScan/cancelScan 等
    if (this.props.vm && typeof this.props.vm.cancelPeripheralRequests === 'function') {
      try { this.props.vm.cancelPeripheralRequests(); } catch (e) { /* noop */ }
    }
  }

  handlePeripheralScanTimeout() {
    this.stopScanningSafely();
    this.unbindPeripheralUpdates();
    if (this._uiTimeout) clearTimeout(this._uiTimeout);
    this.setState({ phase: PHASES.notfound });
  }

  handlePeripheralListUpdate(newList) {
    const arr = Object.keys(newList).map(id => newList[id]);
    // 按 RSSI 从高到低
    arr.sort((a, b) => (b.rssi ?? -Infinity) - (a.rssi ?? -Infinity));

    if (arr.length > 0) {
      // 命中后立刻停扫 & 解绑，避免并发
      this.stopScanningSafely();
      this.unbindPeripheralUpdates();
      if (this._uiTimeout) clearTimeout(this._uiTimeout);
      const first = arr[0];
      // 多参兼容：父层若只接1个参数，多余会被忽略
      this.props.onConnecting(first.peripheralId, first.name);
    }
  }

  bindPeripheralUpdates() {
    if (this._listening) return;
    this.props.vm.on('PERIPHERAL_LIST_UPDATE', this.handlePeripheralListUpdate);
    this.props.vm.on('PERIPHERAL_SCAN_TIMEOUT', this.handlePeripheralScanTimeout);
    this._listening = true;
  }

  unbindPeripheralUpdates() {
    if (!this._listening) return;
    this.props.vm.removeListener('PERIPHERAL_LIST_UPDATE', this.handlePeripheralListUpdate);
    this.props.vm.removeListener('PERIPHERAL_SCAN_TIMEOUT', this.handlePeripheralScanTimeout);
    this._listening = false;
  }

  handleRefresh() {
    this.stopScanningSafely();
    this.unbindPeripheralUpdates();
    if (this._uiTimeout) clearTimeout(this._uiTimeout);
    this.setState({ phase: PHASES.prescan });
  }

  handleStartScan() {
    const targetId = this.props.extensionId || this.props.deviceId; // 统一入口
    this.unbindPeripheralUpdates();
    this.bindPeripheralUpdates();

    // 关键：必须由“用户点击”触发，浏览器才允许 Web-BLE 弹窗
    this.props.vm.scanForPeripheral(targetId);

    // UI 超时兜底（12s）
    if (this._uiTimeout) clearTimeout(this._uiTimeout);
    this._uiTimeout = setTimeout(() => {
      if (this.state.phase === PHASES.pressbutton) this.handlePeripheralScanTimeout();
    }, 12000);

    this.setState({ phase: PHASES.pressbutton });
  }

  render() {
    const title = (this.props.extensionId || this.props.deviceId) || 'Connect to device';
    return (
      <AutoScanningComponent
        connectionTipIconURL={this.props.connectionTipIconURL}
        phase={this.state.phase}
        title={title}
        onRefresh={this.handleRefresh}
        onStartScan={this.handleStartScan}
      />
    );
  }
}

AutoScanningStep.propTypes = {
  connectionTipIconURL: PropTypes.string,
  // 二选一：舞台实时（extensionId）或设备（deviceId）
  extensionId: PropTypes.string,
  deviceId: PropTypes.string,
  onConnecting: PropTypes.func.isRequired,
  vm: PropTypes.instanceOf(VM).isRequired
};

export default AutoScanningStep;
