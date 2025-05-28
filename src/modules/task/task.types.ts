export type CreateTaskType = {
  title: string;
  description?: string;
  assigner: string;
  startDate?: Date; //
  endDate?: Date; //
  type: string;
};

export type CreateMemoTaskType = Omit<CreateTaskType, 'type'> & {
  documentNumber: string; //
  marking?: string; //
  markingVoiceUrl?: string;
  markingDate?: Date;
};

export type CreateWorkGroupTaskType = Omit<CreateTaskType, 'type'> & {
  name: string; //
  leader: string;
  members: string[];
  marking?: string; //
  markingVoiceUrl?: string;
  markingDate?: Date;
};
