import React, { useEffect, useRef, useState } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as mobilenet from '@tensorflow-models/mobilenet';
import * as knnClassifier from '@tensorflow-models/knn-classifier';
import { initNotifications, notify } from '@mycv/f8-notification';
import { Howl } from 'howler';
import soundUrl from './assets/hey_sound.mp3';
import './App.css';

var sound = new Howl({
  src: [soundUrl]
});


const NOT_TOUCH = 'not_touch';
const TOUCHED = 'touched';
const TRAINING_TIMES = 50;
const TOUCHED_CONFIDENCES = 0.8;
const btn = ["Train 1", "Train 2", "Run"];

function App() {
  const video = useRef();
  const classifier = useRef();
  const canPlaySound = useRef(true);
  const mobilenetModel = useRef();
  const [touched, setTouched] = useState(false);
  const [step, setStep] = useState(0);
  const [state, setState] = useState('Ấn để thực hiện chức năng');

  const init = async () => {
    await setupCamera();
    console.log('setup camera done');
    classifier.current = knnClassifier.create();
    mobilenetModel.current = await mobilenet.load();
    console.log('setup done');
    setStep(1);
  }

  const setupCamera = () => {
    return new Promise((resolve, reject) => {
      navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
      if (navigator.getUserMedia) {
        navigator.getUserMedia(
          { video: true },
          stream => {
            video.current.srcObject = stream;
            video.current.addEventListener('loadeddata', resolve)
          },
          error => reject()
        )
      } else {
        reject();
      }
    })
  }

  const handleNextStep = async index => {
    switch (index) {
      case 1:
        setState('Đang thực hiện chức năng Traning 1');
        await train(NOT_TOUCH);
        setStep(index + 1);
        setState('Ấn để thực hiện chức năng tiếp theo');
        break;
      case 2:
        setState('Đang thực hiện chức năng Traning 2');
        await train(TOUCHED);
        setStep(index + 1);
        setState('Ấn để thực hiện chức năng tiếp theo');
        break;
      case 3:
        setState('Đang chạy, thử để tay lên mặt xem!');
        run();
        break;
      default:
        break;
    }
  }

  const train = async lable => {
    console.log(`${lable} training...`);
    for (let i = 0; i < TRAINING_TIMES; i++) {
      console.log(`Process ${parseInt((i + 1) / TRAINING_TIMES * 100)}%`);

      await training(lable);
    }
  }

  const training = lable => {
    return new Promise(async resolve => {
      const embedding = mobilenetModel.current.infer(
        video.current,
        true
      );
      classifier.current.addExample(embedding, lable);
      await sleep(100);
      resolve();
    })
  }

  const sleep = (ms = 0) => {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  const run = async () => {
    const embedding = mobilenetModel.current.infer(
      video.current,
      true
    );
    const result = await classifier.current.predictClass(embedding);
    if (result.label === TOUCHED && result.confidences[result.label] >= TOUCHED_CONFIDENCES) {
      if (canPlaySound.current) {
        canPlaySound.current = false;
        sound.play();
      }

      notify('Your title', { body: 'Your message.' });
      setTouched(true);
    } else setTouched(false);

    await sleep(200);

    run();
  }

  useEffect(() => {
    init();
    sound.on('end', function () {
      canPlaySound.current = true;
    });
    //clearup
    return () => {

    }
  }, [])

  return (
    <div className={`main ${touched ? 'touched' : ''} `}>
      <h1 className='heading'>DON'T TOUCH YOUR FACE</h1>
      <video
        ref={video}
        className="video"
        autoPlay
      />
      <div className="control">
        {(step == 0) ?
          <h3>Đang cấu hình camera xin đợi chút !</h3>
          :
          <div className='body'>
            <h3 className='title'>{state}</h3>
            <button className='btn' onClick={() => handleNextStep(step)}>{btn[step - 1]}</button>
          </div>
        }
      </div>
    </div>
  );
}

export default App;
