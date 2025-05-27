import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { Link } from 'react-router-dom';

export default function ResetSuccess() {
  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex w-1/2 bg-cover"
           style={{backgroundImage:"url('/assets/success.png')"}} />
      <div className="flex flex-col justify-center items-center w-full lg:w-1/2 p-8">
        <CheckCircleIcon className="h-12 w-12 text-green-500"/>
        <h2 className="text-2xl font-semibold mt-4 text-center">You've successfully updated your password</h2>
        <p className="text-gray-500 mb-8 text-center">Sign in to your account with your new password</p>
        <Link to="/login"
              className="px-8 py-2 bg-[#3D298D] text-white rounded-xl hover:bg-indigo-700">
          Sign in
        </Link>
      </div>
    </div>
  );
}
