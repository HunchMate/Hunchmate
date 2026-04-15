import { useEffect, useMemo, useRef, useState } from 'react';
import { useScroll, useTransform, motion as Motion } from 'motion/react';
import { CalendarClock, Sparkles, ArrowUpRight, Flame } from 'lucide-react';
import './Timeline.css';

const stageLabels = ['Launch', 'Prepare', 'Build', 'Wrap-up'];
const stageHints = ['Start here', 'Lock your plan', 'Ship the work', 'Submit & celebrate'];
const stageTones = ['tone--blue', 'tone--gold', 'tone--violet', 'tone--mint'];

export function Timeline({ data, heading, subheading }) {
  const contentRef = useRef(null);
  const containerRef = useRef(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const node = contentRef.current;
    if (!node) return;

    const measure = () => {
      const rect = node.getBoundingClientRect();
      setHeight(rect.height);
    };

    measure();

    const ro = new ResizeObserver(measure);
    ro.observe(node);

    return () => ro.disconnect();
  }, [data]);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start 16%', 'end 70%'],
  });

  const heightTransform = useTransform(scrollYProgress, [0, 1], [0, height]);
  const opacityTransform = useTransform(scrollYProgress, [0, 0.12], [0, 1]);

  const summary = useMemo(() => {
    const total = data.length;
    const first = data[0]?.title || 'Journey';
    const last = data[total - 1]?.title || 'Finish';

    return [
      { label: 'Stages', value: `${total}`, icon: Sparkles },
      { label: 'Start', value: first, icon: CalendarClock },
      { label: 'Finish', value: last, icon: Flame },
    ];
  }, [data]);

  return (
    <section className="timeline-fx timeline-fx--story" ref={containerRef} aria-label="Event journey">
      {(heading || subheading) && (
        <div className="timeline-fx__intro timeline-fx__intro--story">
          <div className="timeline-fx__eyebrow">
            <Sparkles size={14} />
            Event journey
          </div>
          {heading ? <h3 className="timeline-fx__heading">{heading}</h3> : null}
          {subheading ? <p className="timeline-fx__subheading">{subheading}</p> : null}
        </div>
      )}

      <div className="timeline-fx__summary">
        {summary.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="timeline-fx__summary-card glass">
              <span className="timeline-fx__summary-label">
                <Icon size={14} /> {item.label}
              </span>
              <strong>{item.value}</strong>
            </div>
          );
        })}
      </div>

      <div ref={contentRef} className="timeline-fx__content timeline-fx__content--story">
        <div className="timeline-fx__rail" aria-hidden>
          <Motion.div
            style={{
              height: heightTransform,
              opacity: opacityTransform,
            }}
            className="timeline-fx__rail-progress"
          />
        </div>

        {data.map((item, index) => {
          const stageLabel = stageLabels[index] || `Stage ${index + 1}`;
          const stageHint = stageHints[index] || 'Keep moving';
          const tone = stageTones[index] || 'tone--blue';
          const checkpointLabel = index === data.length - 1 ? 'Final checkpoint' : `Checkpoint ${index + 1}`;

          return (
            <Motion.article
              key={`${item.title}-${index}`}
              className={`timeline-fx__row timeline-fx__row--story ${tone}`}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.22 }}
              transition={{ duration: 0.45, ease: 'easeOut', delay: index * 0.08 }}
            >
              <div className="timeline-fx__badge-col">
                <div className="timeline-fx__badge">
                  <span>{String(index + 1).padStart(2, '0')}</span>
                </div>
                <div className="timeline-fx__badge-text">
                  <p className="timeline-fx__checkpoint-label">{checkpointLabel}</p>
                  <p>{stageLabel}</p>
                  <span>{stageHint}</span>
                </div>
              </div>

              <div className="timeline-fx__card-wrap timeline-fx__card-wrap--story">
                <div className="timeline-fx__card-shell glass">
                  <div className="timeline-fx__card-glow" aria-hidden />
                  <div className="timeline-fx__card-top">
                    <div className="timeline-fx__chip">{stageLabel}</div>
                    <div className="timeline-fx__spark"><ArrowUpRight size={16} /></div>
                  </div>

                  <h4 className="timeline-fx__title">{item.title}</h4>
                  <div className="timeline-fx__card-content">{item.content}</div>
                </div>
              </div>
            </Motion.article>
          );
        })}
      </div>
    </section>
  );
}
