import { Button } from '@/components/ui/button';

interface TechCardProps {
  title: string;
  description: string;
  features: string[];
  variant?: 'default' | 'secondary' | 'outline';
}

/**
 * Example component demonstrating:
 * - shadcn/ui Button component
 * - Tailwind CSS utility classes
 * - TypeScript props interface
 */
export function TechCard({ title, description, features, variant = 'default' }: TechCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-xl transition-shadow duration-300 p-6 space-y-4 border border-gray-200 dark:border-gray-700">
      <div className="space-y-2">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
          {title}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {description}
        </p>
      </div>
      
      <ul className="space-y-2">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start gap-2">
            <span className="text-green-500 mt-1">✓</span>
            <span className="text-sm text-gray-700 dark:text-gray-300">{feature}</span>
          </li>
        ))}
      </ul>
      
      <div className="pt-2">
        <Button variant={variant} className="w-full">
          Learn More
        </Button>
      </div>
    </div>
  );
}
