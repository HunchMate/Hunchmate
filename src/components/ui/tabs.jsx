import { useState } from 'react';
import { motion as Motion } from 'motion/react';
import { cn } from '../../lib/utils';

export const Tabs = ({
  tabs: propTabs,
  containerClassName,
  activeTabClassName,
  tabClassName,
  contentClassName,
}) => {
  const [active, setActive] = useState(propTabs[0]);
  const [tabs, setTabs] = useState(propTabs);

  const moveSelectedTabToTop = (idx) => {
    const newTabs = [...propTabs];
    const selectedTab = newTabs.splice(idx, 1);
    newTabs.unshift(selectedTab[0]);
    setTabs(newTabs);
    setActive(newTabs[0]);
  };

  return (
    <>
      <div
        className={cn(
          'flex flex-row items-center justify-start [perspective:1000px] relative overflow-auto sm:overflow-visible no-visible-scrollbar max-w-full w-full',
          containerClassName,
        )}
      >
        {propTabs.map((tab, idx) => (
          <button
            key={tab.title}
            onClick={() => moveSelectedTabToTop(idx)}
            className={cn('relative px-4 py-2 rounded-full', active.value === tab.value ? 'active' : '', tabClassName)}
            style={{ transformStyle: 'preserve-3d' }}
            type="button"
          >
            {active.value === tab.value && (
              <Motion.div
                layoutId="clickedbutton"
                transition={{ type: 'spring', bounce: 0.3, duration: 0.6 }}
                className={cn('absolute inset-0 bg-gray-200 dark:bg-zinc-800 rounded-full', activeTabClassName)}
              />
            )}

            <span className="relative block text-black dark:text-white">{tab.title}</span>
          </button>
        ))}
      </div>
      <FadeInDiv
        tabs={tabs}
        active={active}
        key={active.value}
        className={cn(contentClassName)}
      />
    </>
  );
};

export const FadeInDiv = ({ className, tabs, active }) => {
  const activeTab = tabs[0];

  return (
    <div className="relative w-full h-full min-h-[24rem]">
      <Motion.div
        key={activeTab?.value || active?.value}
        layoutId={activeTab?.value || active?.value}
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: 'easeOut' }}
        className={cn('w-full', className)}
      >
        {activeTab?.content}
      </Motion.div>
    </div>
  );
};
