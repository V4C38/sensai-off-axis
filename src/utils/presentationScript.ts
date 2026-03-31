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
      { text: '200+ Hackers...', durationSeconds: 1.0 },
      { text: '36+ Hours...', durationSeconds: 1.0 },
      { text: '50+ Worlds...', durationSeconds: 1.0 },
      { text: 'at the #WorldsInAction Hack!', durationSeconds: 1.0 },
    ],
  },
  {
    splatIndex: 2,
    captions: [
      { text: 'Candy Land Diners', durationSeconds: 2.25 },
    ],
  },
  {
    splatIndex: 3,
    captions: [
      { text: '-! GET TEAM NAME !-', durationSeconds: 2.25 },
    ],
  },
  {
    splatIndex: 4,
    captions: [
      { text: 'Barbie Bathroom', durationSeconds: 2.25 },
    ],
  },
  {
    splatIndex: 5,
    captions: [
      { text: '-! GET TEAM NAME !-', durationSeconds: 2.0 },
      { text: 'What would be yours?', durationSeconds: 1.5 },
      { text: 'Bring yours to the next Hack!', durationSeconds: 1.5 },
    ],
  },
];
