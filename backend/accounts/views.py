from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate, get_user_model

from .serializers import RegisterSerializer, LoginSerializer, UserSerializer

User = get_user_model()


def get_tokens_for_user(user):
    """Generate JWT access and refresh tokens for a user."""
    refresh = RefreshToken.for_user(user)
    return {
        'access': str(refresh.access_token),
        'refresh': str(refresh),
    }


@api_view(['POST'])
@permission_classes([AllowAny])
def register_view(request):
    """Register a new organization and admin user."""
    serializer = RegisterSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = serializer.save()
    tokens = get_tokens_for_user(user)
    return Response({
        'user': UserSerializer(user).data,
        'tokens': tokens,
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    """Authenticate a user and return JWT tokens."""
    serializer = LoginSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    user = authenticate(
        request,
        username=serializer.validated_data['email'],
        password=serializer.validated_data['password'],
    )

    if user is None:
        return Response(
            {'detail': 'Invalid email or password.'},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    tokens = get_tokens_for_user(user)
    return Response({
        'user': UserSerializer(user).data,
        'tokens': tokens,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """Blacklist the refresh token to log the user out."""
    try:
        refresh_token = request.data.get('refresh')
        if refresh_token:
            token = RefreshToken(refresh_token)
            token.blacklist()
        return Response({'detail': 'Logged out successfully.'}, status=status.HTTP_200_OK)
    except Exception:
        return Response({'detail': 'Logged out successfully.'}, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me_view(request):
    """Return the authenticated user's profile."""
    return Response(UserSerializer(request.user).data)
