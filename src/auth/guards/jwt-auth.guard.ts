import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { isAuthDisabled } from '../../common/utils/auth-bypass.util';
import { UserRole } from '../../enums/user.enum';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
	canActivate(context: ExecutionContext) {
		if (isAuthDisabled()) {
			const request = context.switchToHttp().getRequest<{ headers: Record<string, unknown>; user?: { id?: number; role?: UserRole } }>();
			const headers = request.headers ?? {};
			const rawUserId = headers['x-user-id'];
			const parsedUserId = typeof rawUserId === 'string' ? Number(rawUserId) : Array.isArray(rawUserId) ? Number(rawUserId[0]) : undefined;
			const userId = Number.isFinite(parsedUserId) ? parsedUserId : undefined;

			const rawRole = headers['x-user-role'];
			const roleCandidate = typeof rawRole === 'string' ? rawRole : Array.isArray(rawRole) ? rawRole[0] : undefined;
			const role = (Object.values(UserRole) as string[]).includes(roleCandidate ?? '') ? (roleCandidate as UserRole) : undefined;

			request.user = request.user ?? {};
			request.user.id = userId;
			request.user.role = role;

			return true;
		}

		return super.canActivate(context);
	}
}
