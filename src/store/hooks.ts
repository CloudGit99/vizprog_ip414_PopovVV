import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "./store";

/**
 * Типизированный dispatch hook для обычных actions и async thunks.
 */
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();

/**
 * Типизированный selector hook для чтения данных из Redux state.
 */
export const useAppSelector = useSelector.withTypes<RootState>();
