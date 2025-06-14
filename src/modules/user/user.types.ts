import { Role } from '../../types/roles';

export type AuthUserType = {
  id: string; // Хэрэглэгчийн ID
  role: Role; // Хэрэглэгчийн үүрэг (хэрэв байгаа бол)
  branchId: string;
};

export type CreateUserType = {
  workerId: string; // Ажилтны ID
  surname: string; // Овог
  givenname: string; // Нэр
  position: string; // Албан тушаал
  rank: string; // Цол
  branchId: string; // Салбарын ID
  role?: Role; // Хэрэглэгчийн үүрэг (хэрэв байгаа бол)
  password: string; // Нууц үг
  joinedDate?: Date; // Нэгдсэн огноо (хэрэв байгаа бол)
};
