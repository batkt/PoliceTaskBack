import { IUser } from '../modules/user/user.model';

export const getRankWithName = (user: IUser) => {
  return `${user.rank} ${user.surname?.[0]}.${user.givenname}`;
};
