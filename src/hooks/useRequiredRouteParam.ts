import { useParams } from 'react-router-dom';

export function useRequiredRouteParam(paramName: string): string {
  const params = useParams();
  const value = params[paramName];

  if (!value) {
    throw new Error(`Route parameter "${paramName}" is required.`);
  }

  return value;
}
