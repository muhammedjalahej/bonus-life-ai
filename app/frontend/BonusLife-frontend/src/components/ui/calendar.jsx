'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import * as React from 'react';
import { DayPicker } from 'react-day-picker';

import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';

function Calendar({ className, classNames, showOutsideDays = true, components: userComponents, ...props }) {
  const defaultClassNames = {
    months: 'relative flex flex-col sm:flex-row gap-4',
    month: 'w-full',
    month_caption: 'relative mx-10 mb-1 flex h-9 items-center justify-center z-20',
    caption_label: 'text-sm font-medium text-white',
    nav: 'absolute top-0 flex w-full justify-between z-10',
    button_previous: cn(buttonVariants({ variant: 'ghost' }), 'size-9 text-white/40 hover:text-white p-0'),
    button_next: cn(buttonVariants({ variant: 'ghost' }), 'size-9 text-white/40 hover:text-white p-0'),
    weekday: 'size-9 p-0 text-xs font-medium text-white/30',
    day_button:
      'relative flex size-9 items-center justify-center whitespace-nowrap rounded-lg p-0 text-white outline-offset-2 group-[[data-selected]:not(.range-middle)]:[transition-property:color,background-color,border-radius,box-shadow] group-[[data-selected]:not(.range-middle)]:duration-150 focus:outline-none group-data-[disabled]:pointer-events-none focus-visible:z-10 hover:bg-white/10 group-data-[selected]:bg-white hover:text-white group-data-[selected]:text-black group-data-[disabled]:text-white/20 group-data-[disabled]:line-through group-data-[outside]:text-white/20 group-data-[outside]:group-data-[selected]:text-black focus-visible:outline focus-visible:outline-2',
    day: 'group size-9 px-0 text-sm',
    range_start: 'range-start',
    range_end: 'range-end',
    range_middle: 'range-middle',
    today:
      '*:after:pointer-events-none *:after:absolute *:after:bottom-1 *:after:start-1/2 *:after:z-10 *:after:size-[3px] *:after:-translate-x-1/2 *:after:rounded-full *:after:bg-white [&[data-selected]:not(.range-middle)>*]:after:bg-black [&[data-disabled]>*]:after:bg-white/20 *:after:transition-colors',
    outside: 'text-white/20',
    hidden: 'invisible',
    week_number: 'size-9 p-0 text-xs font-medium text-white/30',
  };

  const mergedClassNames = Object.keys(defaultClassNames).reduce(
    (acc, key) => ({
      ...acc,
      [key]: classNames?.[key]
        ? cn(defaultClassNames[key], classNames[key])
        : defaultClassNames[key],
    }),
    {}
  );

  const defaultComponents = {
    Chevron: (props) => {
      if (props.orientation === 'left') {
        return <ChevronLeft size={16} strokeWidth={2} {...props} aria-hidden="true" />;
      }
      return <ChevronRight size={16} strokeWidth={2} {...props} aria-hidden="true" />;
    },
  };

  const mergedComponents = { ...defaultComponents, ...userComponents };

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('w-fit', className)}
      classNames={mergedClassNames}
      components={mergedComponents}
      {...props}
    />
  );
}
Calendar.displayName = 'Calendar';

export { Calendar };
