import React, { useState } from 'react';
import { FormattedMessage, intlShape } from 'react-intl';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import ScrollableFeed from 'react-scrollable-feed';

import Box from '../box/box.jsx';
import MenuBarMenu from '../menu-bar/menu-bar-menu.jsx';
import { MenuItem, MenuSection } from '../menu/menu.jsx';
import styles from './hardware-console.css';
import cleanIcon from './clean.svg';
import settingIcon from './setting.svg';
import pauseIcon from './pause.svg';
import startIcon from './start.svg';
import runIcon from './exec.svg'; // 运行图标
import endIcon from './end.svg'; // 结束图标
import { getLanguageFromDeviceType } from '../../lib/device'; // Import the function

const DeviceType = {
    Python: 'python', // Define or import DeviceType
    // Other device types...
};

// 将 Uint8Array 转换为十六进制字符串
const toHexForm = buffer => Array.prototype.map.call(buffer,
    x => x.toString(16).toUpperCase()).join(' ');

const HardwareConsoleComponent = props => {
    const [inputValue, setInputValue] = useState('');
    const [isRunning, setIsRunning] = useState(false); // 管理运行状态

    const {
        baudrate,
        baudrateList,
        consoleArray,
        eol,
        eolList,
        intl,
        isAutoScroll,
        isHexForm,
        isPause,
        onClickClean,
        onClickPause,
        onClickSerialportMenu,
        onClickHexForm,
        onClickAutoScroll,
        onClickSend,
        onInputChange,
        onKeyDown,
        onRequestSerialportMenu,
        onSelectBaudrate,
        onSelectEol,
        serialportMenuOpen,
        deviceType,
        codeEditorValue, // 添加这个 prop 2024-09-06
        isCodeEditorLocked, // 添加这个 prop 2024-09-06
    } = props;

    // Determine if the run/end icon should be displayed
    const showRunEndIcon = getLanguageFromDeviceType(deviceType) === DeviceType.Python;

    // 点击发送按钮时清空输入框
    const handleSendClick = () => {
        if (inputValue.trim() !== '') { // 确保输入不为空
            onClickSend(inputValue);    // 传递输入框的值
            setInputValue('');          // 清空输入框
        }
    };

    // 监听键盘事件，检测是否按下 Enter 键
    const handleKeyDown = (e) => {
        if (e.key === 'Enter') { // 或者使用 e.keyCode === 13
            e.preventDefault(); // 阻止默认行为（例如换行）
            handleSendClick();   // 触发发送逻辑
        }
    };

    const handleRunEndClick = () => {
        if (isRunning) {
            // 处理“结束”逻辑 发送 Ctrl+C
            // 执行结束操作
            onClickSend("\x03"); // '\x04' 是 Ctrl+D 的 ASCII 表示 '\x03' 是 Ctrl+C 的 ASCII 表示
            setIsRunning(false);
        } else {
            // 处理“运行”逻辑
            const formattedCode = codeEditorValue;
              // 发送 Ctrl+E 进入粘贴模式
            onClickSend(""); // 发送空行
            onClickSend("\x05"); // '\x05' 是 Ctrl+E 的 ASCII 表示
            const lines = formattedCode.split('\r\n');
            // 根据 isCodeEditorLocked 状态决定是否跳过第一行
            const startLineIndex = isCodeEditorLocked ? 0 : 0;
            // 从指定的行开始发送
            lines.slice(startLineIndex).forEach(line => {
                onClickSend(line);
                console.log(line);
            });

            // 延迟 400ms 清空
            setTimeout(() => {
                onClickClean();
            }, 400);
            // 发送 Ctrl+D 退出粘贴模式
           // 延迟 500ms 发送 Ctrl+D 退出粘贴模式
            setTimeout(() => {
                onClickSend("\x04"); // '\x04' 是 Ctrl+D 的 ASCII 表示
            }, 450);
            setIsRunning(true);
        }
    };

    return (
        <Box className={styles.hardwareConsoleWrapper}>
            <Box className={styles.consoleArray}>
                <ScrollableFeed forceScroll={isAutoScroll}>
                    <span>
                        {isHexForm ? toHexForm(consoleArray) : new TextDecoder('utf-8').decode(consoleArray)}
                    </span>
                </ScrollableFeed>
            </Box>
            <button
                className={classNames(styles.button, styles.pauseButton)}
                onClick={onClickPause}
            >
                <img
                    alt="Pause"
                    className={classNames(styles.pauseIcon)}
                    src={isPause ? startIcon : pauseIcon}
                />
            </button>
            <button
                className={classNames(styles.button, styles.cleanButton)}
                onClick={onClickClean}
            >
                <img
                    alt="Clean"
                    className={classNames(styles.cleanIcon)}
                    src={cleanIcon}
                />
            </button>
            {showRunEndIcon && (
                <button
                    className={classNames(styles.button, styles.runButton)} // 使用新的 class
                    onClick={handleRunEndClick} // 切换功能
                >
                    <img
                        alt={isRunning ? 'End' : 'Run'}
                        className={classNames(styles.runIcon)}
                        src={isRunning ? endIcon : runIcon}
                    />
                </button>
            )}
            <Box className={styles.consoleMenuWarpper}>
                <input
                    className={styles.consoleInput}
                    value={inputValue} // 确保 input 的 value 绑定到 inputValue
                    onChange={e => {
                        setInputValue(e.target.value); // 更新状态
                        if (onInputChange) {
                            onInputChange(e);         // 调用父组件的回调
                        }
                    }}
                    onKeyDown={handleKeyDown}
                />
                <button
                    className={classNames(styles.button, styles.sendButton)}
                    onClick={handleSendClick} // 点击发送按钮后触发 handleSendClick
                >
                    <FormattedMessage
                        defaultMessage="Send"
                        description="Button in bottom to send data to serialport"
                        id="gui.hardwareConsole.send"
                    />
                </button>
                <button
                    className={classNames(styles.button, styles.settingButton)}
                >
                    <img
                        alt="Setting"
                        className={classNames(styles.settingIcon, {
                            [styles.active]: serialportMenuOpen
                        })}
                        src={settingIcon}
                        onMouseUp={onClickSerialportMenu}
                    />
                    <MenuBarMenu
                        className={classNames(styles.MenuBarMenu)}
                        menuClassName={styles.menu}
                        open={serialportMenuOpen}
                        place={'left'}
                        direction={'up'} // 修正拼写错误
                        onRequestClose={onRequestSerialportMenu}
                    >
                        <MenuSection>
                            <MenuItem isRtl={props.isRtl}>
                                <FormattedMessage
                                    defaultMessage="Baudrate"
                                    description="Serial baudrate."
                                    id="gui.hardwareConsole.baudrate"
                                />
                                <select onChange={onSelectBaudrate}>
                                    {baudrateList.map(item => (
                                        <option
                                            key={item.key}
                                            selected={baudrate === item.key}
                                        >
                                            {item.value}
                                        </option>
                                    ))}
                                </select>
                            </MenuItem>
                            <MenuItem isRtl={props.isRtl}>
                                <FormattedMessage
                                    defaultMessage="End of line"
                                    description="End of line."
                                    id="gui.hardwareConsole.endOfLine"
                                />
                                <select onChange={onSelectEol}>
                                    {eolList.map(item => (
                                        <option
                                            key={item.key}
                                            selected={eol === item.key}
                                        >
                                            {intl.formatMessage(item.value)}
                                        </option>
                                    ))}
                                </select>
                            </MenuItem>
                        </MenuSection>
                        <MenuSection>
                            <MenuItem
                                onClick={onClickHexForm}
                                isRtl={props.isRtl}
                            >
                                <FormattedMessage
                                    defaultMessage="Hex form"
                                    description="Display serial port data in hexadecimal."
                                    id="gui.hardwareConsole.hexform"
                                />
                                <input
                                    type="checkbox"
                                    name="hexform"
                                    checked={isHexForm}
                                    readOnly
                                />
                            </MenuItem>
                            <MenuItem
                                onClick={onClickAutoScroll}
                                isRtl={props.isRtl}
                                bottomLine
                            >
                                <FormattedMessage
                                    defaultMessage="Auto scroll"
                                    description="Auto scroll serialport console data."
                                    id="gui.hardwareConsole.autoScroll"
                                />
                                <input
                                    type="checkbox"
                                    name="autoScroll"
                                    checked={isAutoScroll}
                                    readOnly
                                />
                            </MenuItem>
                        </MenuSection>
                    </MenuBarMenu>
                </button>
            </Box>
        </Box>
    );
};

HardwareConsoleComponent.propTypes = {
    baudrate: PropTypes.string.isRequired,
    baudrateList: PropTypes.arrayOf(
        PropTypes.shape({
            key: PropTypes.string.isRequired,
            value: PropTypes.number.isRequired
        })
    ),
    consoleArray: PropTypes.instanceOf(Uint8Array),
    eol: PropTypes.string.isRequired,
    eolList: PropTypes.arrayOf(
        PropTypes.shape({
            key: PropTypes.string.isRequired,
            value: PropTypes.shape({
                defaultMessage: PropTypes.string.isRequired,
                description: PropTypes.string,
                id: PropTypes.string.isRequired
            })
        })
    ),
    intl: intlShape,
    isRtl: PropTypes.bool,
    isHexForm: PropTypes.bool.isRequired,
    isPause: PropTypes.bool.isRequired,
    isAutoScroll: PropTypes.bool.isRequired,
    isRunning: PropTypes.bool.isRequired, // 添加这个 prop 2024-09-06
    onClickClean: PropTypes.func.isRequired,
    onClickPause: PropTypes.func.isRequired,
    onClickAutoScroll: PropTypes.func.isRequired,
    onClickHexForm: PropTypes.func.isRequired,
    onClickSend: PropTypes.func.isRequired,
    onClickSerialportMenu: PropTypes.func.isRequired,
    onInputChange: PropTypes.func.isRequired,
    onKeyDown: PropTypes.func.isRequired,
    onClickRun: PropTypes.func.isRequired, // 添加这个回调 2024-09-06
    onClickEnd: PropTypes.func.isRequired, // 添加这个回调 2024-09-06
    onRequestSerialportMenu: PropTypes.func.isRequired,
    onSelectBaudrate: PropTypes.func.isRequired,
    onSelectEol: PropTypes.func.isRequired,
    serialportMenuOpen: PropTypes.bool.isRequired,
    deviceType: PropTypes.string.isRequired // Add deviceType to propTypes
};

export default HardwareConsoleComponent;
