import { SplatIndex } from './sceneConfig';

export interface PresentationCaption {
  text: string;
  durationSeconds: number;
}

export interface PresentationScene {
  splatIndex: SplatIndex;
  captions: PresentationCaption[];
}

// Edit this file to change the presentation flow and timing.
export const INITIAL_SEQUENCE_DELAY_SECONDS = 3.0;
export const SPLAT_CROSSFADE_DURATION_SECONDS = 0.5;
export const CAPTION_FADE_DURATION_SECONDS = 0.2;

export const PRESENTATION_SEQUENCE: readonly PresentationScene[] = [
  {
    splatIndex: 1,
    captions: [
      { text: 'Worlds in Action Hack Project Showcase!', durationSeconds: 2.5 },
      { text: '200+ Hackers...', durationSeconds: 1.5 },
      { text: '36+ Hours...', durationSeconds:   1.5 },
      { text: '40+ Worlds...', durationSeconds: 1.5 },
    ],
  },
  {
    splatIndex: 2,
    captions: [
      { text: 'TV Blaster', durationSeconds: 3.0 },
    ],
  },
  {
    splatIndex: 3,
    captions: [
      { text: 'Candy Land Diners', durationSeconds: 3.0 },
    ],
  },
  {
    splatIndex: 4,
    captions: [
      { text: 'Barbie Bathroom', durationSeconds: 3.0 },
    ],
  },
  {
    splatIndex: 5,
    captions: [
      { text: 'Floral Bedrooms', durationSeconds: 2.0 },
      { text: 'Which world would you build?', durationSeconds: 1.5 },
      { text: 'Join the next Worlds in Action Hack!', durationSeconds: 1.5 },
    ],
  },
];
