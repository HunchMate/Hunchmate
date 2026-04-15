import { cn } from '../lib/utils';
import { NoiseBackground } from './ui/noise-background';

export default function NoiseBackgroundDemoSecond() {
  return (
    <div className="mx-auto max-w-sm">
      <NoiseBackground
        gradientColors={[
          'rgb(255, 100, 150)',
          'rgb(100, 150, 255)',
          'rgb(255, 200, 100)',
        ]}
      >
        <Card>
          <img
            src="https://assets.aceternity.com/blog/how-to-create-a-bento-grid.png"
            alt="Task Complete"
            className="h-60 w-full rounded-lg object-cover"
          />
          <div className="px-4 py-2">
            <h3 className="text-left text-lg font-semibold text-balance text-neutral-800 dark:text-neutral-200">
              How to create a bento grid with Tailwind
            </h3>
            <p className="mt-2 text-left text-sm text-neutral-600 dark:text-neutral-400">
              Learn how to create a bento grid with Tailwind CSS, Next.js and Framer Motion.
            </p>
          </div>
        </Card>
      </NoiseBackground>
    </div>
  );
}

const Card = ({ className, children }) => {
  return (
    <div
      className={cn(
        'flex h-full min-h-80 flex-col overflow-hidden rounded-lg bg-white text-center dark:bg-neutral-800',
        className,
      )}
    >
      {children}
    </div>
  );
};
