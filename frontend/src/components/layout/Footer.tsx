import React from 'react'
import { Link } from 'react-router-dom'

const footerGroups = [
  {
    title: 'Shop',
    links: [
      { label: 'Cleanser', href: '/shop?category=cleansers' },
      { label: 'Serum', href: '/shop?category=serums' },
      { label: 'Moisturizer', href: '/shop?category=moisturizers' },
      { label: 'Sunscreen', href: '/shop?category=sunscreen' },
    ],
  },
  {
    title: 'More',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Journal', href: '/journal' },
      { label: 'Checkout', href: '/checkout' },
    ],
  },
  {
    title: 'Follow',
    links: [
      { label: 'Instagram', href: '#' },
      { label: 'TikTok', href: '#' },
      { label: 'YouTube', href: '#' },
    ],
  },
]

export default function Footer() {
  return (
    <footer className="pt-[40px] pb-[32px]">
      <div className="container-custom grid grid-cols-1 gap-y-[40px]">
        <div className="grid gap-6 md:grid-cols-6 lg:gap-0">
          <div className="md:col-span-2">
            <p className="text__20 text-Mneutral-700">
              A relationship between you and your skin,
              <br className="hidden lg:block" /> between nature and science,
              <br className="hidden lg:block" /> between beauty and responsibility.
            </p>
          </div>

          <div className="hidden lg:col-span-1 lg:block" />

          <div className="md:col-span-4 lg:col-span-3">
            <div className="grid grid-cols-2 gap-y-6 xs:flex xs:items-start xs:justify-between">
              {footerGroups.map((group) => (
                <div key={group.title} className="grid grid-cols-1 gap-3">
                  <div className="h-px w-[140px] bg-Mneutral-200" />
                  <h5 className="text__14 text-Mneutral-500">{group.title}</h5>
                  {group.links.map((link) => (
                    link.href.startsWith('#') ? (
                      <a key={link.label} href={link.href} className="text__16 flex w-[130px] items-center justify-between gap-2 text-Mneutral-900">
                        {link.label}
                        <img src="/images/ArrowUpRight.svg" alt="" className="h-4 w-4" />
                      </a>
                    ) : (
                      <Link key={link.label} to={link.href} className="text__16 text-Mneutral-900">
                        {link.label}
                      </Link>
                    )
                  ))}
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
            BACK TO TOP
          </button>
          <img src="/images/Group 1.svg" className="w-full object-cover" alt="" />
        </div>

        <div className="flex items-center justify-between">
          <p className="text__14 text-Mneutral-500">©2026 Calesta. all right reserved.</p>
          <Link to="/about" className="text__14 text-Mneutral-500">
            About
          </Link>
        </div>
      </div>
    </footer>
  )
}
