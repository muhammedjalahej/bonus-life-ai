import React, { createContext, useContext, useState, useCallback } from 'react';
import { tourSteps } from './tourSteps';
import { waitForElement } from './waitForElement';

const STORAGE_KEY = 'bonuslife_tour_completed';
const ELEMENT_WAIT_MS = 8000;

const TourContext = createContext(null);

export function TourProvider({ children }) {
  const [active, setActive] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const setCompleted = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
    } catch {}
  }, []);

  const start = useCallback(async () => {
    setActive(true);
    setCurrentIndex(0);
    const step = tourSteps[0];
    if (step) {
      await waitForElement(step.selector, ELEMENT_WAIT_MS, true);
    }
  }, []);

  const skip = useCallback(() => {
    setActive(false);
    setCompleted();
  }, [setCompleted]);

  const restart = useCallback(async () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    await start();
  }, [start]);

  const next = useCallback(async () => {
    if (currentIndex >= tourSteps.length - 1) {
      setActive(false);
      setCompleted();
      return;
    }
    const nextIndex = currentIndex + 1;
    const step = tourSteps[nextIndex];
    setCurrentIndex(nextIndex);
    if (step) {
      const el = await waitForElement(step.selector, step.optional ? 4000 : ELEMENT_WAIT_MS, true);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentIndex]);

  const back = useCallback(async () => {
    if (currentIndex <= 0) return;
    const prevIndex = currentIndex - 1;
    const step = tourSteps[prevIndex];
    setCurrentIndex(prevIndex);
    if (step) {
      const el = await waitForElement(step.selector, step.optional ? 4000 : ELEMENT_WAIT_MS, true);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentIndex]);

  const value = {
    active,
    currentIndex,
    start,
    skip,
    next,
    back,
    restart,
    steps: tourSteps,
    currentStep: tourSteps[currentIndex] || null,
  };

  return (
    <TourContext.Provider value={value}>
      {children}
    </TourContext.Provider>
  );
}

export function useTour() {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error('useTour must be used within TourProvider');
  const completed = typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY) === 'true';
  return { ...ctx, completed };
}
