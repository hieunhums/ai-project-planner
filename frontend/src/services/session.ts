export type Persona = 'planner' | 'admin';

const PERSONA_KEY = 'demoPersona';

export const setPersona = (persona: Persona) => {
  localStorage.setItem(PERSONA_KEY, persona);
};

export const getPersona = (): Persona | null => {
  const value = localStorage.getItem(PERSONA_KEY);
  if (value === 'planner' || value === 'admin') {
    return value;
  }
  return null;
};

export const clearPersona = () => {
  localStorage.removeItem(PERSONA_KEY);
};
