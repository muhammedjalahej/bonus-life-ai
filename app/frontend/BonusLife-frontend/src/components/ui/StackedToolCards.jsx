'use client'
import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { ArrowRight } from 'lucide-react'

function cn(...inputs) { return twMerge(clsx(inputs)) }

const CARD_H   = 64
const CARD_GAP = 8
const collapsedTop = (i) => i * 14
const expandedTop  = (i) => i * (CARD_H + CARD_GAP)

const ACCENT = {
  violet:  { arrowColor: '#ffffff' },
  blue:    { arrowColor: '#ffffff' },
  emerald: { arrowColor: '#ffffff' },
}

export function StackedToolCards({ titleEn, titleTr, accent, items, isTr }) {
  const [isActive, setIsActive] = useState(false)
  const a = ACCENT[accent] || ACCENT.violet

  const collapsedH = CARD_H + 14 * (items.length - 1) + 8
  const expandedH  = items.length * (CARD_H + CARD_GAP) - CARD_GAP + 52

  return (
    <div
      className="relative w-full transition-all duration-1000 ease-[cubic-bezier(0.075,0.82,0.165,1)] cursor-pointer"
      style={{ height: isActive ? expandedH : collapsedH }}
      onClick={() => !isActive && setIsActive(true)}
    >
      {items.map((item, index) => {

        return (
          <motion.div
            key={item.path}
            initial="initial"
            whileHover={isActive ? 'hover' : 'initial'}
            className={cn(
              'absolute left-0 right-0 h-16 rounded-xl overflow-hidden',
              'border border-white/10 bg-white/5',
              'shadow-lg shadow-black/5 backdrop-blur-xl',
              'transition-[top] duration-1000 ease-[cubic-bezier(0.075,0.82,0.165,1)]',
              'dark:border-white/5 dark:bg-white/[0.03]'
            )}
            style={{
              top: isActive ? expandedTop(index) : collapsedTop(index),
              zIndex: isActive ? 1 : items.length - index,
            }}
          >
            <Link
              to={item.path}
              onClick={e => !isActive && e.preventDefault()}
              className={cn(
                'flex w-full h-full items-center gap-0 no-underline',
                isActive ? 'pointer-events-auto' : 'pointer-events-none'
              )}
            >
              {/* Arrow slides in from left */}
              <motion.div
                variants={{
                  initial: { x: '-110%', opacity: 0 },
                  hover:   { x: 0,       opacity: 1 },
                }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                style={{ color: a.arrowColor, paddingLeft: '1rem', flexShrink: 0, display: 'flex', alignItems: 'center' }}
              >
                <ArrowRight strokeWidth={2.5} style={{ width: 14, height: 14 }} />
              </motion.div>

              {/* Icon + label slide right */}
              <motion.div
                variants={{
                  initial: { x: -16 },
                  hover:   { x: 4 },
                }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="flex items-center gap-3 flex-1 min-w-0 px-4"
              >

                <motion.p
                  variants={{
                    initial: { color: 'rgba(255,255,255,0.75)' },
                    hover:   { color: '#ffffff' },
                  }}
                  className="truncate text-sm font-medium"
                >
                  {isTr ? item.labelTr : item.labelEn}
                </motion.p>
              </motion.div>
            </Link>
          </motion.div>
        )
      })}

      {/* Show less */}
      <div
        className={cn(
          'absolute left-0 right-0 flex justify-center transition-all duration-300 ease-in-out',
          isActive
            ? 'pointer-events-auto visible opacity-100'
            : 'pointer-events-none invisible opacity-0'
        )}
        style={{ top: items.length * (CARD_H + CARD_GAP) + 8 }}
        onClick={e => { e.stopPropagation(); setIsActive(false) }}
      >
        <button className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold text-white/40 backdrop-blur-sm transition-colors hover:bg-white/10 hover:text-white/70">
          Show less
        </button>
      </div>
    </div>
  )
}
