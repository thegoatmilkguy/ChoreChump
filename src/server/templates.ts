import { EffortSize } from './decay.js';

export interface TemplateChore {
  title: string;
  description: string;
  effort_size: EffortSize;
  points: number;
  decay_hours: number;
  requires_approval?: boolean;
}

export interface RoomTemplate {
  key: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  chores: TemplateChore[];
}

export const ROOM_TEMPLATES: RoomTemplate[] = [
  {
    key: 'kids_bedroom',
    name: "Kid's Bedroom",
    icon: 'Bed',
    color: 'indigo',
    description: 'Daily tidy habits plus weekly floor & surface care to keep the bedroom clean.',
    chores: [
      {
        title: 'Make the bed',
        description: 'Pull up sheets & comforter and arrange pillows neatly',
        effort_size: 'quick',
        points: 10,
        decay_hours: 24,
      },
      {
        title: 'Dirty clothes in hamper',
        description: 'Pick up all clothes off the floor and bed and put them in the laundry hamper',
        effort_size: 'quick',
        points: 10,
        decay_hours: 24,
      },
      {
        title: 'Clear floor & put away toys/books',
        description: 'Nothing left sitting on the bedroom floor so it is clear to walk',
        effort_size: 'medium',
        points: 25,
        decay_hours: 36,
      },
      {
        title: 'Tidy desk & nightstand',
        description: 'Put away school supplies, dishes, and trash from surfaces',
        effort_size: 'quick',
        points: 15,
        decay_hours: 72,
      },
      {
        title: 'Vacuum bedroom floor',
        description: 'Vacuum the entire carpet/floor including edges',
        effort_size: 'big',
        points: 50,
        decay_hours: 168,
        requires_approval: true,
      },
    ],
  },
  {
    key: 'kitchen',
    name: 'Kitchen',
    icon: 'Utensils',
    color: 'amber',
    description: 'Counters, dishes, table, and floors that make the kitchen sparkle.',
    chores: [
      {
        title: 'Clear & wipe dining table',
        description: 'Bring all dishes to sink and wipe the table clean with spray',
        effort_size: 'quick',
        points: 10,
        decay_hours: 24,
      },
      {
        title: 'Load or unload dishwasher',
        description: 'Put clean dishes away in cabinets or load dirty dishes from sink',
        effort_size: 'medium',
        points: 25,
        decay_hours: 24,
      },
      {
        title: 'Wipe kitchen counters & sink',
        description: 'Clear crumbs, wipe countertops, and rinse out the sink basin',
        effort_size: 'medium',
        points: 25,
        decay_hours: 24,
      },
      {
        title: 'Sweep kitchen floor',
        description: 'Sweep under the table, cabinets, and high-traffic areas',
        effort_size: 'medium',
        points: 25,
        decay_hours: 48,
      },
      {
        title: 'Take out kitchen trash & recycling',
        description: 'Tie up full bag, take to outside bin, and put in a fresh liner',
        effort_size: 'medium',
        points: 25,
        decay_hours: 48,
      },
      {
        title: 'Mop kitchen floor',
        description: 'Wet mop the entire kitchen floor after sweeping',
        effort_size: 'big',
        points: 50,
        decay_hours: 168,
        requires_approval: true,
      },
    ],
  },
  {
    key: 'living_room',
    name: 'Living Room',
    icon: 'Sofa',
    color: 'emerald',
    description: 'Keep the family gathering space cozy, clutter-free, and guest-ready.',
    chores: [
      {
        title: 'Fluff pillows & fold throw blankets',
        description: 'Straighten couch cushions and neatly fold all blankets',
        effort_size: 'quick',
        points: 10,
        decay_hours: 24,
      },
      {
        title: 'Clear coffee table & clutter',
        description: 'Return cups, remotes, shoes, and toys to their proper homes',
        effort_size: 'quick',
        points: 15,
        decay_hours: 24,
      },
      {
        title: 'Vacuum living room rug & floor',
        description: 'Vacuum the main rug and around the sofa',
        effort_size: 'medium',
        points: 30,
        decay_hours: 72,
      },
      {
        title: 'Dust TV stand & shelves',
        description: 'Microfiber dust entertainment center, shelves, and decor',
        effort_size: 'medium',
        points: 25,
        decay_hours: 168,
      },
    ],
  },
  {
    key: 'bathroom',
    name: 'Bathroom',
    icon: 'Bath',
    color: 'cyan',
    description: 'Fresh towels, clean sink, shining mirror, and sanitized fixtures.',
    chores: [
      {
        title: 'Hang up towels & bathmat',
        description: 'Hang all towels neatly on hooks/bars so they dry properly',
        effort_size: 'quick',
        points: 10,
        decay_hours: 24,
      },
      {
        title: 'Wipe sink & bathroom counter',
        description: 'Clean toothpaste spots, soap scum, and clutter off the vanity',
        effort_size: 'quick',
        points: 15,
        decay_hours: 48,
      },
      {
        title: 'Clean bathroom mirror',
        description: 'Spray glass cleaner and wipe streak-free',
        effort_size: 'quick',
        points: 15,
        decay_hours: 120,
      },
      {
        title: 'Empty bathroom trash can',
        description: 'Empty small bin into main trash and replace liner',
        effort_size: 'quick',
        points: 10,
        decay_hours: 120,
      },
      {
        title: 'Scrub toilet & tub/shower',
        description: 'Brush toilet bowl, wipe seat, and rinse shower walls',
        effort_size: 'big',
        points: 50,
        decay_hours: 168,
        requires_approval: true,
      },
    ],
  },
  {
    key: 'playroom',
    name: 'Playroom',
    icon: 'Gamepad2',
    color: 'rose',
    description: 'Sort toys, games, arts & crafts so there is room to play.',
    chores: [
      {
        title: 'Put toys & LEGOs into bins',
        description: 'Sort all loose toys off the floor back into their labeled bins',
        effort_size: 'medium',
        points: 25,
        decay_hours: 24,
      },
      {
        title: 'Organize books & board games',
        description: 'Stack board games with lids on and stand books upright on shelves',
        effort_size: 'quick',
        points: 15,
        decay_hours: 72,
      },
      {
        title: 'Wipe craft / play table',
        description: 'Cap markers, put away art supplies, and wipe down the table',
        effort_size: 'quick',
        points: 15,
        decay_hours: 48,
      },
      {
        title: 'Vacuum playroom floor',
        description: 'Vacuum the whole floor once toys are picked up',
        effort_size: 'big',
        points: 45,
        decay_hours: 168,
      },
    ],
  },
  {
    key: 'master_bedroom',
    name: 'Master Bedroom',
    icon: 'Sparkles',
    color: 'purple',
    description: 'Peaceful, tidy sanctuary for Mom & Dad.',
    chores: [
      {
        title: 'Make master bed',
        description: 'Straighten sheets, duvet, and pillows',
        effort_size: 'quick',
        points: 10,
        decay_hours: 24,
      },
      {
        title: 'Clear nightstands & dressers',
        description: 'Put away glasses, laundry, and miscellaneous items',
        effort_size: 'quick',
        points: 15,
        decay_hours: 48,
      },
      {
        title: 'Wash, fold & put away laundry',
        description: 'Complete weekly laundry cycle and put clothes in drawers/closet',
        effort_size: 'big',
        points: 50,
        decay_hours: 168,
      },
      {
        title: 'Vacuum master bedroom',
        description: 'Vacuum floors and rugs',
        effort_size: 'medium',
        points: 30,
        decay_hours: 168,
      },
    ],
  },
  {
    key: 'yard_entry',
    name: 'Entryway & Yard',
    icon: 'Trees',
    color: 'teal',
    description: 'Shoes, backpacks, coats, and outdoor chores.',
    chores: [
      {
        title: 'Line up shoes on shoe rack',
        description: 'Match pairs and place all shoes neatly by the door',
        effort_size: 'quick',
        points: 10,
        decay_hours: 24,
      },
      {
        title: 'Hang backpacks, lunchboxes & coats',
        description: 'Hang bags and jackets on hooks and empty lunchboxes to kitchen',
        effort_size: 'quick',
        points: 10,
        decay_hours: 24,
      },
      {
        title: 'Water indoor/porch plants',
        description: 'Give plants fresh water',
        effort_size: 'quick',
        points: 15,
        decay_hours: 72,
      },
      {
        title: 'Yard pickup & sweep porch',
        description: 'Pick up yard toys/branches and sweep the front porch',
        effort_size: 'big',
        points: 50,
        decay_hours: 168,
      },
    ],
  },
];
