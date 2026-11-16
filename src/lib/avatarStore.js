import defaultAvatar from '../assets/default-avatar.png';

import blueRunner from '../assets/avatars/avatar-blue-runner.png';
import desertAvatar from '../assets/avatars/avatar-desert.png';
import foxLegendary from '../assets/avatars/avatar-fox-legendary.png';
import greenHero from '../assets/avatars/avatar-green-hero.png';
import oceanAvatar from '../assets/avatars/avatar-ocean.png';
import petLegendary from '../assets/avatars/avatar-pet-legendary.png';
import redHero from '../assets/avatars/avatar-red-hero.png';
import shadowAvatar from '../assets/avatars/avatar-shadow.png';

export const AVATARS = [
  {
    id: 'starter',
    name: 'Default',
    description: 'Your original Kiddocation avatar.',
    price: 0,
    rarity: 'common',
    image: defaultAvatar,
  },
  {
    id: 'green-hero',
    name: 'Green Hero',
    description: 'A new look for your learning adventure.',
    price: 150,
    rarity: 'common',
    image: greenHero,
  },
  {
    id: 'ocean',
    name: 'Ocean Explorer',
    description: 'Explore your next learning challenge.',
    price: 200,
    rarity: 'common',
    image: oceanAvatar,
  },
  {
    id: 'blue-runner',
    name: 'Blue Runner',
    description: 'A sporty look for fast learners.',
    price: 250,
    rarity: 'rare',
    image: blueRunner,
  },
  {
    id: 'fox-legendary',
    name: 'Fox Spirit',
    description: 'A special legendary avatar.',
    price: 800,
    rarity: 'legendary',
    image: foxLegendary,
  },
  {
    id: 'shadow',
    name: 'Shadow Scout',
    description: 'Unlock this mysterious character.',
    price: 300,
    rarity: 'rare',
    image: shadowAvatar,
  },
  {
    id: 'desert',
    name: 'Desert Adventurer',
    description: 'Ready for a new adventure.',
    price: 350,
    rarity: 'rare',
    image: desertAvatar,
  },
  {
    id: 'red-hero',
    name: 'Red Hero',
    description: 'A bold look for determined learners.',
    price: 450,
    rarity: 'rare',
    image: redHero,
  },
  {
    id: 'pet-legendary',
    name: 'Legendary Pet',
    description: 'A rare companion for your journey.',
    price: 1200,
    rarity: 'legendary',
    image: petLegendary,
  },
];