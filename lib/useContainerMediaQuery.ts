import { useCallback, useState } from 'react';
import { useEffect, useLayoutEffect } from 'react';

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export enum SizeTo {
	DOWN_TO = 'downTo',
	UP = 'up',
}

const getMatches = (el: HTMLElement | null | undefined, size: number, option: SizeTo): boolean => {
	// Prevents SSR issues
	if (typeof window !== 'undefined' && el) {
		if (option === SizeTo.DOWN_TO) {
			return el.offsetWidth <= size;
		}
		return el.offsetWidth > size;
	}
	return false;
};

function useContainerMediaQuery<T extends HTMLElement = HTMLDivElement>(
	size: number,
	option: SizeTo
): [(node: T | null) => void, boolean] {
	const [ref, setRef] = useState<T | null>(null);
	const [matches, setMatches] = useState<boolean>(getMatches(ref, size, option));

	// Prevent too many rendering using useCallback
	const handleSize = useCallback(() => {
		setMatches(getMatches(ref, size, option));
	}, [ref?.offsetHeight, ref?.offsetWidth]);

	useIsomorphicLayoutEffect(() => {
		handleSize();

		// Listen matchMedia
		if (window) {
			window.addEventListener('resize', handleSize);
		}

		return () => {
			if (window) {
				window.removeEventListener('resize', handleSize);
			}
		};
	}, [ref?.offsetWidth]);

	return [setRef, matches];
}

export default useContainerMediaQuery;
