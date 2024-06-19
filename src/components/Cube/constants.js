import * as THREE from 'three';

// 魔方参数
export const cubeParams = {
    x: 0,
    y: 0,
    z: 0,
    num: 3,
    len: 50,
    colors: [
        'rgb(255, 0, 0)',
        'rgb(255, 112, 0)',
        'rgb(255, 255, 0)',
        'rgb(0, 112, 0)',
        'rgb(0, 0, 255)',
        'rgb(255, 255, 255)'
    ]
};

export const origPoint = new THREE.Vector3(0, 0, 0); // 原点
export const raycaster = new THREE.Raycaster(); // 光线碰撞检测器
export const mouse = new THREE.Vector2(); // 存储鼠标坐标或者触摸坐标

// 魔方转动的六个方向
export const xLine = new THREE.Vector3(1, 0, 0); // X轴正方向
export const xLineAd = new THREE.Vector3(-1, 0, 0); // X轴负方向
export const yLine = new THREE.Vector3(0, 1, 0); // Y轴正方向
export const yLineAd = new THREE.Vector3(0, -1, 0); // Y轴负方向
export const zLine = new THREE.Vector3(0, 0, 1); // Z轴正方向
export const zLineAd = new THREE.Vector3(0, 0, -1); // Z轴负方向
