'use client';
import {
  memo,
  ReactNode,
  useState,
  ChangeEvent,
  FormEvent,
  useEffect,
  useRef,
  forwardRef,
} from 'react';
import Image from 'next/image';
import {
  motion,
  useAnimation,
  useInView,
  useMotionTemplate,
  useMotionValue,
} from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ==================== Input Component ====================

const Input = memo(
  forwardRef(function Input(
    { className, type, ...props }: React.InputHTMLAttributes<HTMLInputElement>,
    ref: React.ForwardedRef<HTMLInputElement>
  ) {
    const radius = 100;
    const [visible, setVisible] = useState(false);

    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    function handleMouseMove({
      currentTarget,
      clientX,
      clientY,
    }: React.MouseEvent<HTMLDivElement>) {
      const { left, top } = currentTarget.getBoundingClientRect();
      mouseX.set(clientX - left);
      mouseY.set(clientY - top);
    }

    return (
      <motion.div
        style={{
          background: useMotionTemplate`
        radial-gradient(
          ${visible ? radius + 'px' : '0px'} circle at ${mouseX}px ${mouseY}px,
          #F29BB2,
          transparent 80%
        )
      `,
        }}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        className='group/input rounded-lg p-[2px] transition duration-300'
      >
        <input
          type={type}
          className={cn(
            `flex h-10 w-full rounded-md border-none px-3 py-2 text-sm transition duration-400 file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50`,
            className
          )}
          ref={ref}
          {...props}
        />
      </motion.div>
    );
  })
);

Input.displayName = 'Input';

// ==================== BoxReveal Component ====================

type BoxRevealProps = {
  children: ReactNode;
  width?: string;
  boxColor?: string;
  duration?: number;
  overflow?: string;
  position?: string;
  className?: string;
};

const BoxReveal = memo(function BoxReveal({
  children,
  width = 'fit-content',
  boxColor,
  duration,
  overflow = 'hidden',
  position = 'relative',
  className,
}: BoxRevealProps) {
  const mainControls = useAnimation();
  const slideControls = useAnimation();
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (isInView) {
      slideControls.start('visible');
      mainControls.start('visible');
    } else {
      slideControls.start('hidden');
      mainControls.start('hidden');
    }
  }, [isInView, mainControls, slideControls]);

  return (
    <section
      ref={ref}
      style={{
        position: position as
          | 'relative'
          | 'absolute'
          | 'fixed'
          | 'sticky'
          | 'static',
        width,
        overflow,
      }}
      className={className}
    >
      <motion.div
        variants={{
          hidden: { opacity: 0, y: 75 },
          visible: { opacity: 1, y: 0 },
        }}
        initial='hidden'
        animate={mainControls}
        transition={{ duration: duration ?? 0.5, delay: 0.25 }}
      >
        {children}
      </motion.div>
      <motion.div
        variants={{ hidden: { left: 0 }, visible: { left: '100%' } }}
        initial='hidden'
        animate={slideControls}
        transition={{ duration: duration ?? 0.5, ease: 'easeIn' }}
        style={{
          position: 'absolute',
          top: 4,
          bottom: 4,
          left: 0,
          right: 0,
          zIndex: 20,
          background: boxColor ?? '#5046e6',
          borderRadius: 4,
        }}
      />
    </section>
  );
});

// ==================== Ripple Component ====================

type RippleProps = {
  mainCircleSize?: number;
  mainCircleOpacity?: number;
  numCircles?: number;
  className?: string;
};

const Ripple = memo(function Ripple({
  mainCircleSize = 210,
  mainCircleOpacity = 0.24,
  numCircles = 11,
  className = '',
}: RippleProps) {
  return (
    <section
      className={`absolute inset-0 flex items-center justify-center pointer-events-none ${className}`}
    >
      {Array.from({ length: numCircles }, (_, i) => {
        const size = mainCircleSize + i * 70;
        const opacity = mainCircleOpacity - i * 0.03;
        const animationDelay = `${i * 0.06}s`;
        const borderStyle = i === numCircles - 1 ? 'dashed' : 'solid';
        const borderOpacity = 5 + i * 5;

        return (
          <span
            key={i}
            className='absolute rounded-full border'
            style={{
              width: `${size}px`,
              height: `${size}px`,
              opacity: opacity,
              animationDelay: animationDelay,
              borderStyle: borderStyle,
              borderWidth: '1px',
              borderColor: `rgba(61, 49, 91, ${borderOpacity / 100})`,
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              animation: 'ripple 2s ease calc(var(--i, 0) * 0.2s) infinite',
            }}
          />
        );
      })}
    </section>
  );
});

// ==================== OrbitingCircles Component ====================

type OrbitingCirclesProps = {
  className?: string;
  children: ReactNode;
  reverse?: boolean;
  duration?: number;
  delay?: number;
  radius?: number;
  path?: boolean;
};

const OrbitingCircles = memo(function OrbitingCircles({
  className,
  children,
  reverse = false,
  duration = 20,
  delay = 10,
  radius = 50,
  path = true,
}: OrbitingCirclesProps) {
  return (
    <>
      {path && (
        <svg
          xmlns='http://www.w3.org/2000/svg'
          version='1.1'
          className='pointer-events-none absolute inset-0 size-full'
        >
          <circle
            className='stroke-[#3D315B]/10 stroke-1'
            cx='50%'
            cy='50%'
            r={radius}
            fill='none'
          />
        </svg>
      )}
      <section
        style={
          {
            '--duration': duration,
            '--radius': radius,
            '--delay': -delay,
            animation: 'orbit calc(var(--duration) * 1s) linear infinite',
            animationDirection: reverse ? 'reverse' : 'normal',
          } as React.CSSProperties
        }
        className={cn(
          'absolute flex size-full transform-gpu items-center justify-center rounded-full [animation-delay:calc(var(--delay)*1000ms)]',
          className
        )}
      >
        {children}
      </section>
    </>
  );
});

// ==================== AnimatedForm Component ====================

type FieldType = 'text' | 'email' | 'password';

type Field = {
  label: string;
  required?: boolean;
  type: FieldType;
  placeholder?: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
};

type AnimatedFormProps = {
  header: string;
  subHeader?: string;
  fields: Field[];
  submitButton: string;
  textVariantButton?: string;
  errorField?: string;
  fieldPerRow?: number;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  googleLogin?: string;
  goTo?: (event: React.MouseEvent<HTMLButtonElement>) => void;
};

type Errors = {
  [key: string]: string;
};

const AnimatedForm = memo(function AnimatedForm({
  header,
  subHeader,
  fields,
  submitButton,
  textVariantButton,
  errorField,
  fieldPerRow = 1,
  onSubmit,
  googleLogin,
  goTo,
}: AnimatedFormProps) {
  const [visible, setVisible] = useState<boolean>(false);
  const [errors, setErrors] = useState<Errors>({});

  const toggleVisibility = () => setVisible(!visible);

  const validateForm = (event: FormEvent<HTMLFormElement>) => {
    const currentErrors: Errors = {};
    fields.forEach((field) => {
      const value = (event.target as HTMLFormElement)[field.label]?.value;
      if (field.required && !value) {
        currentErrors[field.label] = `${field.label} is required`;
      }
    });
    return currentErrors;
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formErrors = validateForm(event);
    if (Object.keys(formErrors).length === 0) {
      onSubmit(event);
    } else {
      setErrors(formErrors);
    }
  };

  return (
    <section className='flex flex-col gap-[20px] w-full max-w-[420px] mx-auto'>
      <BoxReveal boxColor='var(--skeleton)' duration={0.3}>
        <h2 className='font-bold text-[36px] text-[#3D315B]'>{header}</h2>
      </BoxReveal>
      {subHeader && (
        <BoxReveal boxColor='var(--skeleton)' duration={0.3} className='pb-2'>
          <p className='text-[#202124] text-[15px] max-w-sm'>{subHeader}</p>
        </BoxReveal>
      )}
      <form onSubmit={handleSubmit}>
        <section className={`grid grid-cols-1 mb-4`}>
          {fields.map((field) => (
            <section key={field.label} className='flex flex-col gap-2 mb-4'>
              <BoxReveal boxColor='var(--skeleton)' duration={0.3}>
                <Label htmlFor={field.label} className="text-[#202124] text-[14px]">{field.label}</Label>
              </BoxReveal>
              <BoxReveal width='100%' boxColor='var(--skeleton)' duration={0.3} className='flex flex-col space-y-2 w-full'>
                <section className='relative'>
                  <Input type={field.type === 'password' ? (visible ? 'text' : 'password') : field.type} id={field.label} placeholder={field.placeholder} onChange={field.onChange} className="bg-[#A7D8F5]/10 border border-[#C5B5E8] focus-visible:ring-[#F29BB2] text-[#202124] placeholder:text-[#202124]/50 h-[48px]" />
                  {field.type === 'password' && (
                    <button type='button' onClick={toggleVisibility} className='absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5'>
                      {visible ? <Eye className='h-5 w-5' /> : <EyeOff className='h-5 w-5' />}
                    </button>
                  )}
                </section>
                <section className='h-4'>
                  {errors[field.label] && <p className='text-red-500 text-xs'>{errors[field.label]}</p>}
                </section>
              </BoxReveal>
            </section>
          ))}
        </section>
        <BoxReveal width='100%' boxColor='var(--skeleton)' duration={0.3} overflow='visible'>
          <button className='bg-[#3D315B] hover:bg-[#3D315B]/90 text-white w-full rounded-md h-[48px] font-medium transition-colors' type='submit'>{submitButton}</button>
        </BoxReveal>
      </form>
    </section>
  );
});

// ==================== AuthTabs Component ====================

interface AuthTabsProps {
  formFields: any;
  goTo: any;
  handleSubmit: any;
}

const AuthTabs = memo(function AuthTabs({ formFields, goTo, handleSubmit }: AuthTabsProps) {
  return (
    <div className='flex max-lg:justify-center w-full md:w-auto'>
      <div className='w-full lg:w-[400px] flex flex-col justify-center items-center max-lg:px-[10%]'>
        <AnimatedForm {...formFields} fieldPerRow={1} onSubmit={handleSubmit} goTo={goTo} />
      </div>
    </div>
  );
});

interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> { htmlFor?: string; }
const Label = memo(function Label({ className, ...props }: LabelProps) {
  return <label className={cn('text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70', className)} {...props} />;
});

export { Input, BoxReveal, Ripple, OrbitingCircles, AnimatedForm, AuthTabs, Label };
