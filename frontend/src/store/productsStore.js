import { create } from 'zustand';

const useProductsStore = create((set) => ({
  refreshKey: 0,
  triggerRefresh: () => set((state) => ({ refreshKey: state.refreshKey + 1 })),
}));

export default useProductsStore;
