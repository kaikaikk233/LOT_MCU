// pages/setting/setting.js

const app = getApp(); // 获取全局app实例

Page({
    data: {
        isButtonActive: false, // 按钮激活状态
        corpType: "无", // 农作物种植种类
        corp: "", // 农作物序号
        updata_time: "", // 更新间隔
        temperature_upvalue: "", // 温度上限
        temperature_downvalue: "", // 温度下限
        humidity_upvalue: "", // 湿度上限
        humidity_downvalue: "", // 湿度下限
        soil_humidity_upvalue: "", // 土壤湿度上限
        soil_humidity_downvalue: "", // 土壤湿度下限
        cogas_value: "", // 一氧化碳浓度
        smoggas_value: "", // 烟雾浓度
    },

    handleInput: function(e) {
        const inputType = e.currentTarget.dataset.type;
        const value = e.detail.value.trim();
        this.setData({
            [inputType]: value
        });
    
        const isValid = this.validateInputs();
        this.setData({
            isButtonActive: isValid
        });
    
        if (!isValid) {
            wx.showToast({
                title: '输入参数类型错误，请输入有效的非负整数',
                icon: 'none',
            });
        }
    },

    validateInputs: function() {
        if (this.data.corpType) {
            const corpValue = this.getCrop(this.data.corpType);
            if (corpValue === 0) {
                return false;
            }
        }
    
        if (this.data.updata_time) {
            const updataTimeValue = parseInt(this.data.updata_time, 10);
            if (isNaN(updataTimeValue) || updataTimeValue < 0 || !/^\d+$/.test(this.data.updata_time)) {
                return false;
            }
        }
    
        const numericFields = [
            'temperature_upvalue',
            'temperature_downvalue',
            'humidity_upvalue',
            'humidity_downvalue',
            'soil_humidity_upvalue',
            'soil_humidity_downvalue',
            'cogas_value',
            'smoggas_value'
        ];
    
        for (const field of numericFields) {
            if (this.data[field] !== '') {
                const numericValue = parseInt(this.data[field], 10);
                if (isNaN(numericValue) || numericValue < 0 || !/^\d+$/.test(this.data[field])) {
                    return false;
                }
            }
        }
        return true;
    },
    
    dataUpload: function() {
        wx.getNetworkType({
            success: (res) => {
                if (res.networkType === 'none') {
                    wx.showToast({
                        title: '无网络连接',
                        icon: 'none',
                    });
                    return;
                }

                wx.showLoading({
                    title: '上传数据中',
                });
                
                this.connectAndPublish(() => {
                    wx.hideLoading();
                    wx.showToast({
                        title: '上传设置成功',
                        icon: 'success',
                    });
                    // 清空所有输入框的内容
                    this.setData({
                        corpType: "",
                        updata_time: "",
                        temperature_upvalue: "",
                        temperature_downvalue: "",
                        humidity_upvalue: "",
                        humidity_downvalue: "",
                        soil_humidity_upvalue: "",
                        soil_humidity_downvalue: "",
                        cogas_value: "",
                        smoggas_value: "",
                        isButtonActive: false, // 更新按钮状态为不可点击
                    });
                }, () => {
                    wx.hideLoading();
                    wx.showToast({
                        title: '上传设置失败',
                        icon: 'none',
                    });
                });
            },
        });
    },

    getCrop: function (corpType) { 
        switch (corpType) {
            case '玉米':
                return 1;
            case '小麦':
                return 2;
            case '水稻':
                return 3;
            case '高粱':
                return 4;
            case '大豆':
                return 5;
            default:
                return 0;
        }
    },

    connectAndPublish: function(onSuccess, onFailure) {
        if (!app.mqttService.isConnected) {
            wx.showToast({
                title: 'MQTT未连接',
                icon: 'none',
            });
            onFailure && onFailure();
            return;
        }

        const topic = `/sys/k0t8ejX211I/wechat/thing/event/property/post`;
        const params = {
            method: "thing.event.property.post",
            id: Date.now().toString(),
            params: {}
        };

        // 处理农作物种类
        if (this.data.corpType) {
            const corpValue = this.getCrop(this.data.corpType);
            if (corpValue) {
                params.params['corp'] = corpValue;
            }
        }

        // 处理更新间隔
        if (this.data.updata_time) {
            const updataTimeValue = parseInt(this.data.updata_time, 10);
            if (!isNaN(updataTimeValue) && updataTimeValue >= 0 && /^\d+$/.test(this.data.updata_time)) { // 确保是非负整数
                params.params['updata_time'] = updataTimeValue;
            } else {
                console.log(`updata_time 的值不是一个有效的非负整数。`);
            }
        }

        // 处理其他数值类型输入
        ['temperature_upvalue', 'temperature_downvalue', 'humidity_upvalue', 'humidity_downvalue', 'soil_humidity_upvalue', 'soil_humidity_downvalue', 'cogas_value', 'smoggas_value'].forEach(key => {
            if (this.data[key] !== '') {
                const numericValue = parseInt(this.data[key], 10);
                if (!isNaN(numericValue) && numericValue >= 0 && /^\d+$/.test(this.data[key])) {
                    params.params[key] = numericValue;
                } else {
                    console.log(`${key} 的值不是一个有效的非负整数。`);
                }
            }
        });

        const message = JSON.stringify(params);

        if (app.mqttService.client && app.mqttService.client.connected) {
            app.mqttService.client.publish(topic, message, function(err) {
                if (!err) {
                    onSuccess && onSuccess();
                } else {
                    onFailure && onFailure();
                }
            });
        } else {
            console.error('MQTT客户端未连接');
            onFailure && onFailure();
        }
    },
})
