import React from 'react'
import { Link } from 'react-router-dom'
import { useT, type TKey } from '../../lib/i18n'

const footerGroups: { title: TKey; links: { key: TKey; href: string; external?: boolean }[] }[] = [
  {
    title: 'footer.shop',
    links: [
      { key: 'category.cleansers', href: '/shop?category=cleansers' },
      { key: 'category.serums', href: '/shop?category=serums' },
      { key: 'category.moisturizers', href: '/shop?category=moisturizers' },
      { key: 'category.sunscreen', href: '/shop?category=sunscreen' },
    ],
  },
  {
    title: 'footer.more',
    links: [
      { key: 'nav.about', href: '/about' },
      { key: 'nav.journal', href: '/journal' },
      { key: 'nav.checkout', href: '/checkout' },
    ],
  },
  {
    title: 'footer.follow',
    links: [
      { key: 'footer.follow', href: '#', external: true },
    ],
  },
]

export default function Footer() {
  const t = useT()

  return (
    <footer className="pt-[40px] pb-[32px]">
      <div className="container-custom grid grid-cols-1 gap-y-[40px]">
        <div className="grid gap-6 md:grid-cols-6 lg:gap-0">
          <div className="md:col-span-2">
            <p className="text__20 text-Mneutral-700">{t('footer.tagline')}</p>
          </div>

          <div className="hidden lg:col-span-1 lg:block" />

          <div className="md:col-span-4 lg:col-span-3">
            <div className="grid grid-cols-2 gap-y-6 xs:flex xs:items-start xs:justify-between">
              {footerGroups.map((group) => (
                <div key={group.title} className="grid grid-cols-1 gap-3">
                  <div className="h-px w-[140px] bg-Mneutral-200" />
                  <h5 className="text__14 text-Mneutral-500">{t(group.title)}</h5>
                  {group.title === 'footer.follow' ? (
                    <>
                      <a href="#" className="text__16 flex w-[130px] items-center justify-between gap-2 text-Mneutral-900">
                        Instagram
                        <img src="/images/ArrowUpRight.svg" alt="" className="h-4 w-4" />
                      </a>
                      <a href="#" className="text__16 flex w-[130px] items-center justify-between gap-2 text-Mneutral-900">
                        TikTok
                        <img src="/images/ArrowUpRight.svg" alt="" className="h-4 w-4" />
                      </a>
                      <a href="#" className="text__16 flex w-[130px] items-center justify-between gap-2 text-Mneutral-900">
                        YouTube
                        <img src="/images/ArrowUpRight.svg" alt="" className="h-4 w-4" />
                      </a>
                    </>
                  ) : (
                    group.links.map((link) => (
                      <Link key={link.key} to={link.href} className="text__16 text-Mneutral-900">
                        {t(link.key)}
                      </Link>
                    ))
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-Mneutral-900 px-4 py-3 text__16 font-medium text-white"
          >
            {t('footer.backToTop')}
          </button>
          <img src="/images/Group 1.svg" className="w-full object-cover" alt="" />
        </div>

        <div className="flex items-center justify-between">
          <p className="text__14 text-Mneutral-500">{t('footer.rights')}</p>
          <Link to="/about" className="text__14 text-Mneutral-500">
            {t('footer.about')}
          </Link>
        </div>
      </div>
    </footer>
  )
}
