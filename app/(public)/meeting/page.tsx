import Image from 'next/image';
import Link from 'next/link';
import { Video, ExternalLink } from 'lucide-react';
import { getLogo } from '@/lib/actions/settings.actions';

const GOOGLE_MEET_URL = 'https://meet.google.com/ikd-fjfa-ewb';

export const metadata = {
  title: 'Consultation vidéo - AureLuz Design',
  description: 'Rejoignez votre consultation vidéo avec AureLuz Design',
  robots: 'noindex, nofollow', // Page non indexée par les moteurs de recherche
};

export default async function MeetingPage() {
  const logoUrl = await getLogo();

  return (
    <div className="min-h-screen bg-[#FDF8F3] flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-border py-4">
        <div className="container mx-auto px-4">
          <Link href="/">
            <Image
              src={logoUrl}
              alt="AureLuz Design"
              width={180}
              height={72}
              className="h-16 w-auto"
            />
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            {/* Card Header */}
            <div className="bg-gradient-to-r from-[#1a1a1a] to-[#2d2d2d] p-8 text-center">
              <div className="w-16 h-16 bg-[#c9a227] rounded-full flex items-center justify-center mx-auto mb-4">
                <Video className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-2xl font-serif text-white mb-2">
                Consultation Vidéo
              </h1>
              <p className="text-gray-400">
                AureLuz Design - Décoration sur mesure
              </p>
            </div>

            {/* Card Content */}
            <div className="p-8 space-y-6">
              <div className="text-center">
                <p className="text-gray-600 mb-6">
                  Bienvenue ! Cliquez sur le bouton ci-dessous pour rejoindre
                  votre consultation vidéo avec notre équipe.
                </p>

                <a
                  href={GOOGLE_MEET_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 bg-[#c9a227] hover:bg-[#b89223] text-white px-8 py-4 rounded-full text-lg font-semibold transition-all shadow-lg hover:shadow-xl"
                >
                  <Video className="h-6 w-6" />
                  Rejoindre la réunion
                  <ExternalLink className="h-5 w-5" />
                </a>
              </div>

              {/* Instructions */}
              <div className="bg-[#FDF8F3] rounded-xl p-6 space-y-4">
                <h2 className="font-semibold text-gray-800">
                  Avant de rejoindre :
                </h2>
                <ul className="space-y-3 text-gray-600">
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 bg-[#c9a227]/20 text-[#c9a227] rounded-full flex items-center justify-center text-sm font-medium shrink-0">
                      1
                    </span>
                    <span>Assurez-vous d&apos;avoir une connexion internet stable</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 bg-[#c9a227]/20 text-[#c9a227] rounded-full flex items-center justify-center text-sm font-medium shrink-0">
                      2
                    </span>
                    <span>Vérifiez que votre caméra et microphone fonctionnent</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 bg-[#c9a227]/20 text-[#c9a227] rounded-full flex items-center justify-center text-sm font-medium shrink-0">
                      3
                    </span>
                    <span>Installez-vous dans un endroit calme et bien éclairé</span>
                  </li>
                </ul>
              </div>

              {/* Support */}
              <div className="text-center text-sm text-gray-500">
                <p>
                  Un problème technique ?{' '}
                  <a
                    href="mailto:contact@aureluzdesign.fr"
                    className="text-[#c9a227] hover:underline"
                  >
                    Contactez-nous
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-border py-4 text-center text-sm text-gray-500">
        <p>© {new Date().getFullYear()} AureLuz Design. Tous droits réservés.</p>
      </footer>
    </div>
  );
}
