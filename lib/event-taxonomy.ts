export const EVENT_CATEGORIES = ['Art','Music','Nightlife','Business','Education','Film & media','Health','Hobbies','Government','Sports','Lifestyle'] as const;
export type EventCategory = typeof EVENT_CATEGORIES[number];
