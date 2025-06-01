export type CreateTaskType = {
  title: string;
  description?: string;
  assigner: string;
  startDate: string; //
  endDate: string; //
  type: string;
  priority?: 'low' | 'medium' | 'high';
};

export type CreateMemoTaskType = Omit<CreateTaskType, 'type'> & {
  documentNumber: string; //
  marking?: string; //
  markingVoiceUrl?: string;
  markingDate?: string;
};

export type CreateWorkGroupTaskType = Omit<CreateTaskType, 'type'> & {
  name: string; //
  leader: string;
  members: string[];
  marking?: string; //
  markingVoiceUrl?: string;
  markingDate?: string;
};
