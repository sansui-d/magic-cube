import React, { useEffect, useRef } from 'react';

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

function Home() {
    const sceneRef = useRef(null);
    const lightRef = useRef(null);
    const cubesRef = useRef(null);
    const rendererRef = useRef(null);
    const cameraRef = useRef(null);
    const controllerRef = useRef(null);

    const isRotatingRef = useRef(false); //魔方是否正在转动
    const intersectRef = useRef(null); //碰撞光线穿过的元素
    const normalizeRef = useRef(null); //触发平面法向量
    const startPointRef = useRef(null); //触发点
    const movePointRef = useRef(null); //移动点
    const initStatusRef = useRef([]); //魔方初始状态

    const origPoint = new THREE.Vector3(0, 0, 0); //原点
    const raycaster = new THREE.Raycaster(); //光线碰撞检测器
    const mouse = new THREE.Vector2(); //存储鼠标坐标或者触摸坐标
    //魔方转动的六个方向
    const xLine = new THREE.Vector3(1, 0, 0); //X轴正方向
    const xLineAd = new THREE.Vector3(-1, 0, 0); //X轴负方向
    const yLine = new THREE.Vector3(0, 1, 0); //Y轴正方向
    const yLineAd = new THREE.Vector3(0, -1, 0); //Y轴负方向
    const zLine = new THREE.Vector3(0, 0, 1); //Z轴正方向
    const zLineAd = new THREE.Vector3(0, 0, -1); //Z轴负方向

    //根据页面宽度和高度创建渲染器，并添加容器中
    const initThree = () => {
        const renderer = new THREE.WebGLRenderer({
            antialias: true
        });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setClearColor(0xffffff, 1.0);
        document.getElementById('canvas-frame').appendChild(renderer.domElement);
        rendererRef.current = renderer;
    };

    //创建相机，并设置正方向和中心点
    const initCamera = () => {
        const camera = new THREE.PerspectiveCamera(
            45,
            window.innerWidth / window.innerHeight,
            1,
            1000
        );
        camera.position.set(0, 0, 600);
        camera.up.set(0, 1, 0); //正方向
        camera.lookAt(origPoint);
        cameraRef.current = camera;
    };

    //创建场景，后续元素需要加入到场景中才会显示出来
    const initScene = () => {
        const scene = new THREE.Scene();
        sceneRef.current = scene;
    };

    //创建光线
    const initLight = () => {
        const light = new THREE.AmbientLight(0xfefefe);
        sceneRef.current.add(light);
        lightRef.current = light;
    };

    const cubeParams = {
        //魔方参数
        x: 0,
        y: 0,
        z: 0,
        num: 3,
        len: 50,
        colors: [
            'rgb(255, 0, 0)',
            'rgb(255, 128, 0)',
            'rgb(255, 255, 0)',
            'rgb(0, 128, 0)',
            'rgb(0, 0, 255)',
            'rgb(255, 255, 255)'
        ]
    };

    /**
   * 简易魔方
   * x、y、z 魔方中心点坐标
   * num 魔方阶数
   * len 小方块宽高
   * colors 魔方六面体颜色
   */
    const SimpleCube = (x, y, z, num, len, colors) => {
        //魔方左上角坐标
        const leftUpX = x - (num / 2) * len;
        const leftUpY = y + (num / 2) * len;
        const leftUpZ = z + (num / 2) * len;

        //根据颜色生成材质
        const materialArr = [];
        for (let i = 0; i < colors.length; i++) {
            const texture = new THREE.Texture(faces(colors[i]));
            texture.needsUpdate = true;
            const material = new THREE.MeshBasicMaterial({ map: texture });
            materialArr.push(material);
        }

        const cubes = [];
        for (let i = 0; i < num; i++) {
            for (let j = 0; j < num * num; j++) {
                const cubegeo = new THREE.BoxGeometry(len, len, len);
                const cube = new THREE.Mesh(cubegeo, materialArr);

                //依次计算各个小方块中心点坐标
                cube.position.x = leftUpX + len / 2 + (j % num) * len;
                cube.position.y = leftUpY - len / 2 - parseInt(j / num) * len;
                cube.position.z = leftUpZ - len / 2 - i * len;
                cubes.push(cube);
            }
        }
        return cubes;
    };

    //生成canvas素材
    const faces = (rgbaColor) => {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const context = canvas.getContext('2d');
        if (context) {
            //画一个宽高都是256的黑色正方形
            context.fillStyle = 'rgba(0,0,0,1)';
            context.fillRect(0, 0, 256, 256);
            //在内部用某颜色的16px宽的线再画一个宽高为224的圆角正方形并用改颜色填充
            context.rect(16, 16, 224, 224);
            context.lineJoin = 'round';
            context.lineWidth = 16;
            context.fillStyle = rgbaColor;
            context.strokeStyle = rgbaColor;
            context.stroke();
            context.fill();
        } else {
            alert('您的浏览器不支持Canvas无法预览.\n');
        }
        return canvas;
    };

    //创建展示场景所需的各种元素
    const initObject = () => {
        //生成魔方小正方体
        const cubes = SimpleCube(
            cubeParams.x,
            cubeParams.y,
            cubeParams.z,
            cubeParams.num,
            cubeParams.len,
            cubeParams.colors
        );
        for (let i = 0; i < cubes.length; i++) {
            let item = cubes[i];
            /**
       * 由于筛选运动元素时是根据物体的id规律来的，但是滚动之后位置发生了变化；
       * 再根据初始规律筛选会出问题，而且id是只读变量；
       * 所以这里给每个物体设置一个额外变量cubeIndex，每次滚动之后更新根据初始状态更新该cubeIndex；
       * 让该变量一直保持初始规律即可。
       */
            initStatusRef.current = [
                ...initStatusRef.current,
                {
                    x: item.position.x,
                    y: item.position.y,
                    z: item.position.z,
                    cubeIndex: item.id
                }
            ];
            item.cubeIndex = item.id;
            sceneRef.current.add(cubes[i]); //并依次加入到场景中
        }

        const cubegeo = new THREE.BoxGeometry(150, 150, 150);
        const hex = 0x000000;
        for (let i = 0; i < cubegeo.faces?.length; i += 2) {
            cubegeo.faces[i].color.setHex(hex);
            cubegeo.faces[i + 1].color.setHex(hex);
        }
        const cubemat = new THREE.MeshBasicMaterial({
            vertexColors: 'rgba(255,193,37,1)',
            opacity: 0,
            transparent: true
        });
        const cube = new THREE.Mesh(cubegeo, cubemat);
        cube.cubeType = 'coverCube';
        sceneRef.current.add(cube);
        cubesRef.current = cubes;
    };

    //渲染
    const render = () => {
        rendererRef.current.clear();
        rendererRef.current.render(sceneRef.current, cameraRef.current);
        window.requestAnimationFrame(render);
    };

    //开始
    const threeStart = () => {
        initThree();
        initCamera();
        initScene();
        initLight();
        initObject();
        render();
        //监听鼠标事件
        rendererRef.current.domElement.addEventListener(
            'mousedown',
            startCube,
            false
        );
        rendererRef.current.domElement.addEventListener(
            'mousemove',
            moveCube,
            false
        );
        rendererRef.current.domElement.addEventListener('mouseup', stopCube, false);
        //监听触摸事件
        rendererRef.current.domElement.addEventListener(
            'touchstart',
            startCube,
            false
        );
        rendererRef.current.domElement.addEventListener(
            'touchmove',
            moveCube,
            false
        );
        rendererRef.current.domElement.addEventListener(
            'touchend',
            stopCube,
            false
        );
        //视角控制
        const controller = new OrbitControls(
            cameraRef.current,
            rendererRef.current.domElement
        );
        controller.target = new THREE.Vector3(0, 0, 0); //设置控制点
        console.log(rendererRef.current.domElement, 'controller');
        controllerRef.current = controller;
    };

    //魔方操作结束
    const stopCube = () => {
        intersectRef.current = null;
        startPointRef.current = null;
    };

    //绕着世界坐标系的某个轴旋转
    const rotateAroundWorldY = (obj, rad) => {
        const x0 = obj.position.x;
        const z0 = obj.position.z;
        /**
     * 因为物体本身的坐标系是随着物体的变化而变化的，
     * 所以如果使用rotateZ、rotateY、rotateX等方法，
     * 多次调用后就会出问题，先改为Quaternion实现。
     */
        const q = new THREE.Quaternion();
        q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rad);
        obj.quaternion.premultiply(q);
        //obj.rotateY(rad);
        obj.position.x = Math.cos(rad) * x0 + Math.sin(rad) * z0;
        obj.position.z = Math.cos(rad) * z0 - Math.sin(rad) * x0;
    };
    const rotateAroundWorldZ = (obj, rad) => {
        const x0 = obj.position.x;
        const y0 = obj.position.y;
        const q = new THREE.Quaternion();
        q.setFromAxisAngle(new THREE.Vector3(0, 0, 1), rad);
        obj.quaternion.premultiply(q);
        //obj.rotateZ(rad);
        obj.position.x = Math.cos(rad) * x0 - Math.sin(rad) * y0;
        obj.position.y = Math.cos(rad) * y0 + Math.sin(rad) * x0;
    };
    const rotateAroundWorldX = (obj, rad) => {
        const y0 = obj.position.y;
        const z0 = obj.position.z;
        const q = new THREE.Quaternion();
        q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), rad);
        obj.quaternion.premultiply(q);
        //obj.rotateX(rad);
        obj.position.y = Math.cos(rad) * y0 - Math.sin(rad) * z0;
        obj.position.z = Math.cos(rad) * z0 + Math.sin(rad) * y0;
    };

    //滑动操作魔方
    const moveCube = (event) => {
        getIntersects(event);
        if (intersectRef.current) {
            if (!isRotatingRef.current && startPointRef.current) {
                //魔方没有进行转动且满足进行转动的条件
                movePointRef.current = intersectRef.current.point;
                if (!movePointRef.current.equals(startPointRef?.current)) {
                    //和起始点不一样则意味着可以得到转动向量了
                    isRotatingRef.current = true; //转动标识置为true
                    const sub = movePointRef.current.sub(startPointRef.current); //计算转动向量
                    const direction = getDirection(sub); //获得方向
                    const elements = getBoxs(intersectRef.current, direction);
                    const startTime = new Date().getTime();
                    window.requestAnimationFrame(function (timestamp) {
                        rotateAnimation(elements, direction, timestamp, 0);
                    });
                }
            }
        }
        event.preventDefault();
    };

    /**
   * 旋转动画
   */
    const rotateAnimation = (
        elements,
        direction,
        currentstamp,
        startstamp,
        laststamp
    ) => {
        const totalTime = 500; //转动的总运动时间
        if (startstamp === 0) {
            startstamp = currentstamp;
            laststamp = currentstamp;
        }
        if (currentstamp - startstamp >= totalTime) {
            currentstamp = startstamp + totalTime;
            isRotatingRef.current = false;
            startPointRef.current = null;
            updateCubeIndex(elements);
        }
        switch (direction) {
            //绕z轴顺时针
            case 0.1:
            case 1.2:
            case 2.4:
            case 3.3:
                for (let i = 0; i < elements.length; i++) {
                    rotateAroundWorldZ(
                        elements[i],
                        (((-90 * Math.PI) / 180) * (currentstamp - laststamp)) / totalTime
                    );
                }
                break;
            //绕z轴逆时针
            case 0.2:
            case 1.1:
            case 2.3:
            case 3.4:
                for (let i = 0; i < elements.length; i++) {
                    rotateAroundWorldZ(
                        elements[i],
                        (((90 * Math.PI) / 180) * (currentstamp - laststamp)) / totalTime
                    );
                }
                break;
            //绕y轴顺时针
            case 0.4:
            case 1.3:
            case 4.3:
            case 5.4:
                for (let i = 0; i < elements.length; i++) {
                    rotateAroundWorldY(
                        elements[i],
                        (((-90 * Math.PI) / 180) * (currentstamp - laststamp)) / totalTime
                    );
                }
                break;
            //绕y轴逆时针
            case 1.4:
            case 0.3:
            case 4.4:
            case 5.3:
                for (let i = 0; i < elements.length; i++) {
                    rotateAroundWorldY(
                        elements[i],
                        (((90 * Math.PI) / 180) * (currentstamp - laststamp)) / totalTime
                    );
                }
                break;
            //绕x轴顺时针
            case 2.2:
            case 3.1:
            case 4.1:
            case 5.2:
                for (let i = 0; i < elements.length; i++) {
                    rotateAroundWorldX(
                        elements[i],
                        (((90 * Math.PI) / 180) * (currentstamp - laststamp)) / totalTime
                    );
                }
                break;
            //绕x轴逆时针
            case 2.1:
            case 3.2:
            case 4.2:
            case 5.1:
                for (let i = 0; i < elements.length; i++) {
                    rotateAroundWorldX(
                        elements[i],
                        (((-90 * Math.PI) / 180) * (currentstamp - laststamp)) / totalTime
                    );
                }
                break;
            default:
                break;
        }
        if (currentstamp - startstamp < totalTime) {
            window.requestAnimationFrame(function (timestamp) {
                rotateAnimation(
                    elements,
                    direction,
                    timestamp,
                    startstamp,
                    currentstamp
                );
            });
        }
    };

    //更新位置索引
    const updateCubeIndex = (elements) => {
        for (let i = 0; i < elements.length; i++) {
            let temp1 = elements[i];
            for (let j = 0; j < initStatusRef.current.length; j++) {
                let temp2 = initStatusRef.current[j];
                if (
                    Math.abs(temp1.position.x - temp2.x) <= cubeParams.len / 2 &&
                    Math.abs(temp1.position.y - temp2.y) <= cubeParams.len / 2 &&
                    Math.abs(temp1.position.z - temp2.z) <= cubeParams.len / 2
                ) {
                    temp1.cubeIndex = temp2.cubeIndex;
                    break;
                }
            }
        }
    };

    //根据方向获得运动元素
    const getBoxs = (target, direction) => {
        let targetId = target.object.cubeIndex;
        const ids = [];
        for (let i = 0; i < cubesRef.current.length; i++) {
            ids.push(cubesRef.current[i].cubeIndex);
        }
        const minId = min(ids);
        targetId = targetId - minId;
        const numI = parseInt(targetId / 9);
        const numJ = targetId % 9;
        const boxs = [];
        //根据绘制时的规律判断 no = i*9+j
        switch (direction) {
            //绕z轴
            case 0.1:
            case 0.2:
            case 1.1:
            case 1.2:
            case 2.3:
            case 2.4:
            case 3.3:
            case 3.4:
                for (let i = 0; i < cubesRef.current.length; i++) {
                    const tempId = cubesRef.current[i].cubeIndex - minId;
                    if (numI === parseInt(tempId / 9)) {
                        boxs.push(cubesRef.current[i]);
                    }
                }
                break;
            //绕y轴
            case 0.3:
            case 0.4:
            case 1.3:
            case 1.4:
            case 4.3:
            case 4.4:
            case 5.3:
            case 5.4:
                for (let i = 0; i < cubesRef.current.length; i++) {
                    const tempId = cubesRef.current[i].cubeIndex - minId;
                    if (parseInt(numJ / 3) === parseInt((tempId % 9) / 3)) {
                        boxs.push(cubesRef.current[i]);
                    }
                }
                break;
            //绕x轴
            case 2.1:
            case 2.2:
            case 3.1:
            case 3.2:
            case 4.1:
            case 4.2:
            case 5.1:
            case 5.2:
                for (let i = 0; i < cubesRef.current.length; i++) {
                    const tempId = cubesRef.current[i].cubeIndex - minId;
                    if ((tempId % 9) % 3 === numJ % 3) {
                        boxs.push(cubesRef.current[i]);
                    }
                }
                break;
            default:
                break;
        }
        return boxs;
    };

    //获得旋转方向
    const getDirection = (vector3) => {
        let direction;
        //判断差向量和x、y、z轴的夹角
        const xAngle = vector3.angleTo(xLine);
        const xAngleAd = vector3.angleTo(xLineAd);
        const yAngle = vector3.angleTo(yLine);
        const yAngleAd = vector3.angleTo(yLineAd);
        const zAngle = vector3.angleTo(zLine);
        const zAngleAd = vector3.angleTo(zLineAd);
        const minAngle = min([
            xAngle,
            xAngleAd,
            yAngle,
            yAngleAd,
            zAngle,
            zAngleAd
        ]); //最小夹角

        switch (minAngle) {
            case xAngle:
                direction = 0; //向x轴正方向旋转90度（还要区分是绕z轴还是绕y轴）
                if (normalizeRef.current.equals(yLine)) {
                    direction = direction + 0.1; //绕z轴顺时针
                } else if (normalizeRef.current.equals(yLineAd)) {
                    direction = direction + 0.2; //绕z轴逆时针
                } else if (normalizeRef.current.equals(zLine)) {
                    direction = direction + 0.3; //绕y轴逆时针
                } else {
                    direction = direction + 0.4; //绕y轴顺时针
                }
                break;
            case xAngleAd:
                direction = 1; //向x轴反方向旋转90度
                if (normalizeRef.current.equals(yLine)) {
                    direction = direction + 0.1; //绕z轴逆时针
                } else if (normalizeRef.current.equals(yLineAd)) {
                    direction = direction + 0.2; //绕z轴顺时针
                } else if (normalizeRef.current.equals(zLine)) {
                    direction = direction + 0.3; //绕y轴顺时针
                } else {
                    direction = direction + 0.4; //绕y轴逆时针
                }
                break;
            case yAngle:
                direction = 2; //向y轴正方向旋转90度
                if (normalizeRef.current.equals(zLine)) {
                    direction = direction + 0.1; //绕x轴逆时针
                } else if (normalizeRef.current.equals(zLineAd)) {
                    direction = direction + 0.2; //绕x轴顺时针
                } else if (normalizeRef.current.equals(xLine)) {
                    direction = direction + 0.3; //绕z轴逆时针
                } else {
                    direction = direction + 0.4; //绕z轴顺时针
                }
                break;
            case yAngleAd:
                direction = 3; //向y轴反方向旋转90度
                if (normalizeRef.current.equals(zLine)) {
                    direction = direction + 0.1; //绕x轴顺时针
                } else if (normalizeRef.current.equals(zLineAd)) {
                    direction = direction + 0.2; //绕x轴逆时针
                } else if (normalizeRef.current.equals(xLine)) {
                    direction = direction + 0.3; //绕z轴顺时针
                } else {
                    direction = direction + 0.4; //绕z轴逆时针
                }
                break;
            case zAngle:
                direction = 4; //向z轴正方向旋转90度
                if (normalizeRef.current.equals(yLine)) {
                    direction = direction + 0.1; //绕x轴顺时针
                } else if (normalizeRef.current.equals(yLineAd)) {
                    direction = direction + 0.2; //绕x轴逆时针
                } else if (normalizeRef.current.equals(xLine)) {
                    direction = direction + 0.3; //绕y轴顺时针
                } else {
                    direction = direction + 0.4; //绕y轴逆时针
                }
                break;
            case zAngleAd:
                direction = 5; //向z轴反方向旋转90度
                if (normalizeRef.current.equals(yLine)) {
                    direction = direction + 0.1; //绕x轴逆时针
                } else if (normalizeRef.current.equals(yLineAd)) {
                    direction = direction + 0.2; //绕x轴顺时针
                } else if (normalizeRef.current.equals(xLine)) {
                    direction = direction + 0.3; //绕y轴逆时针
                } else {
                    direction = direction + 0.4; //绕y轴顺时针
                }
                break;
            default:
                break;
        }
        return direction;
    };

    //获取数组中的最小值
    const min = (arr) => {
        let min = arr[0];
        for (let i = 1; i < arr.length; i++) {
            if (arr[i] < min) {
                min = arr[i];
            }
        }
        return min;
    };

    //开始操作魔方
    const startCube = (event) => {
        getIntersects(event);
        //魔方没有处于转动过程中且存在碰撞物体
        if (!isRotatingRef.current && intersectRef.current) {
            startPointRef.current = intersectRef.current.point; //开始转动，设置起始点
            controllerRef.current.enabled = false; //当刚开始的接触点在魔方上时操作为转动魔方，屏蔽控制器转动
            console.log(1);
        } else {
            controllerRef.current.enabled = true; //当刚开始的接触点没有在魔方上或者在魔方上但是魔方正在转动时操作转动控制器
            console.log(2);
        }
    };

    //获取操作焦点以及该焦点所在平面的法向量
    const getIntersects = (event) => {
        //触摸事件和鼠标事件获得坐标的方式有点区别
        if (event.touches) {
            const touch = event.touches[0];
            mouse.x = (touch.clientX / window.innerWidth) * 2 - 1;
            mouse.y = -(touch.clientY / window.innerHeight) * 2 + 1;
        } else {
            mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        }
        raycaster.setFromCamera(mouse, cameraRef.current);
        //Raycaster方式定位选取元素，可能会选取多个，以第一个为准
        const intersects = raycaster.intersectObjects(sceneRef.current.children);
        if (intersects.length) {
            try {
                if (intersects[0].object.cubeType === 'coverCube') {
                    intersectRef.current = intersects[1];
                    normalizeRef.current = intersects[0].face.normal;
                } else {
                    intersectRef.current = intersects[0];
                    normalizeRef.current = intersects[1].face.normal;
                }
            } catch (err) {
                //nothing
            }
        }
    };

    useEffect(() => {
        threeStart();
    }, []);

    return <div id="canvas-frame"></div>;
}

export default Home;
