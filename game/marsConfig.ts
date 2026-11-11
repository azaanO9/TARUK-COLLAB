/** Educational game settings, not a certified astronaut or vehicle simulation. */
export const MARS_PHYSICS = {
  gravity: 3.71,
  jumpSpeed: 2.8, // Authored EVA hop, roughly one metre high at Mars gravity.
  walkSpeed: 2.5,
  sprintSpeed: 5.8,
} as const;
export const MARS_START = { power: 6, air: 6, shield: 3, science: 0, hearts: 3 } as const;
