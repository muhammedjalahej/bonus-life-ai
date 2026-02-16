import React, { useState, useRef, useCallback } from 'react';

const DRAG_THRESHOLD = 6;
const SPRING_MS = 450;
const SPRING_EASE = 'cubic-bezier(0.34, 1.56, 0.64, 1)'; // overshoot spring

/**
 * Wraps content in a card that can be dragged with a spring-back.
 * Does not block link navigation if the user only clicked (minimal movement).
 */
export default function FluidCard({ children, className = '', style = {}, as: Component = 'div', ...rest }) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [transition, setTransition] = useState('');
  const startRef = useRef({ x: 0, y: 0, pointerId: null });
  const didDragRef = useRef(false);

  const handlePointerDown = useCallback((e) => {
    if (e.button !== 0) return;
    startRef.current = { x: e.clientX - pos.x, y: e.clientY - pos.y, pointerId: e.pointerId };
    didDragRef.current = false;
    setTransition('none');
    e.currentTarget.setPointerCapture(e.pointerId);
  }, [pos.x, pos.y]);

  const handlePointerMove = useCallback((e) => {
    if (startRef.current.pointerId == null) return;
    const dx = e.clientX - startRef.current.x;
    const dy = e.clientY - startRef.current.y;
    if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) didDragRef.current = true;
    setPos({ x: dx, y: dy });
  }, []);

  const handlePointerUp = useCallback((e) => {
    if (startRef.current.pointerId != null) {
      e.currentTarget.releasePointerCapture(startRef.current.pointerId);
      startRef.current.pointerId = null;
    }
    setTransition(`transform ${SPRING_MS}ms ${SPRING_EASE}`);
    setPos({ x: 0, y: 0 });
  }, []);

  const handleClick = useCallback((e) => {
    if (didDragRef.current) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, []);

  return (
    <Component
      className={className}
      style={{
        ...style,
        transform: `translate(${pos.x}px, ${pos.y}px)`,
        transition,
        touchAction: 'none',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onClickCapture={handleClick}
      {...rest}
    >
      {children}
    </Component>
  );
}
